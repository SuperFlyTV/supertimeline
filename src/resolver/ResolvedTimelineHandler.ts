import { ExpressionHandler } from './ExpressionHandler'
import { ReferenceHandler, ValueWithReference } from './ReferenceHandler'
import { Expression } from '../api/expression'
import { ResolvedTimeline, ResolvedTimelineObject, TimelineObjectInstance } from '../api/resolvedTimeline'
import { TimelineEnable, TimelineKeyframe, TimelineObject } from '../api/timeline'
import { assertNever, ensureArray, literal, pushToArray } from './lib/lib'
import { InstanceHandler } from './InstanceHandler'
import {
	ObjectReference,
	Reference,
	getRefClass,
	getRefInstanceId,
	getRefLayer,
	getRefObjectId,
	isClassReference,
	isInstanceReference,
	isLayerReference,
	isObjectReference,
	joinReferences,
} from './lib/reference'
import { EventForInstance, InstanceEvent, sortEvents } from './lib/event'
import { Cap, ResolveOptions, ResolverCache } from '../api'
import { InstanceId, getInstancesHash, spliceInstances } from './lib/instance'
import { objHasLayer } from './lib/timeline'
import { LayerStateHandler } from './LayerStateHandler'
import { isConstantExpr } from './lib/expression'
import { tic } from './lib/performance'
import { CacheHandler } from './CacheHandler'

/**
 * A ResolvedTimelineHandler instance is short-lived and used to resolve a timeline.
 * Intended usage:
 * 1. const resolver = new ResolvedTimelineHandler(options)
 * 2. timelineObjects.forEach(obj => resolver.addTimelineObject(obj))
 * 3. resolver.resolveAllTimelineObjs()
 */
export class ResolvedTimelineHandler {
	/** Maps object id to object */
	public objectsMap = new Map<string, ResolvedTimelineObject>()
	/** Maps className to a list of object ids  */
	public classesMap = new Map<string, string[]>()
	/** Maps layer to a list of object ids  */
	public layersMap = new Map<string, string[]>()

	private expression: ExpressionHandler
	private reference: ReferenceHandler
	private instance: InstanceHandler

	/**
	 * Maps an array of object ids to an object id (objects that directly reference an reference).
	 */
	private directReferenceMap = new Map<string, string[]>()
	private cache?: CacheHandler

	/** How many objects that was actually resolved (is affected when using cache) */
	private statisticResolvingCount = 0

	private debug: boolean

	/**
	 * A Map of strings (instance hashes) that is used to determine if an objects instances have changed.
	 * Maps objectId -> instancesHash
	 */
	private resolvedObjInstancesHash = new Map<string, string>()

	/**
	 * List of explanations fow why an object changed during a resolve iteration.
	 * Used for debugging and Errors
	 */
	private changedObjIdsExplanations: string[] = []
	/**
	 * A Map that contains the objects that needs to resolve again.
	 * Object are added into this after this.resolveConflictsForLayer()
	 */
	private objectsToReResolve = new Map<string, ResolvedTimelineObject>()

	/** Counter that increases during resolving, for every object that might need re-resolving*/
	private objectResolveCount = 0

	constructor(public options: ResolveOptions) {
		this.expression = new ExpressionHandler()
		this.instance = new InstanceHandler(this)
		this.reference = new ReferenceHandler(this, this.instance)

		this.debug = this.options.debug ?? false
	}
	/** Populate ResolvedTimelineHandler with a timeline-object. */
	public addTimelineObject(obj: TimelineObject): void {
		this._addTimelineObject(obj, 0, undefined, false)
	}

	/** Resolve the timeline. */
	public resolveAllTimelineObjs(): void {
		const toc = tic('  resolveAllTimelineObjs')
		this.debugTrace('=================================== resolveAllTimelineObjs')

		// Step 0: Preparations:

		/** Number of objects in timeline */
		const objectCount = this.objectsMap.size
		/** Max allowed number of iterations over objects */
		const objectResolveCountMax = objectCount * (this.options.conflictMaxDepth ?? 5)

		/*
			The resolving algorithm basically works like this:

			1a: Resolve all objects
			1b: Resolve conflicts for all layers
				Also determine which objects depend on changed objects due to conflicts

			2: Loop, until there are no more changed objects:
				2a: Resolve objects that depend on changed objects
				2b: Resolve conflicts for affected layers in 2a
					Also determine which objects depend on changed objects due to conflicts
		*/

		// Step 1a: Resolve all objects:
		for (const obj of this.objectsMap.values()) {
			this.resolveTimelineObj(obj)

			// Populate this.resolvedObjInstancesHash now, so that only changes to the timeline instances
			// in this.resolveConflictsForObjs() will be detected later:
			this.resolvedObjInstancesHash.set(obj.id, getInstancesHash(obj.resolved.instances))
		}
		// Step 1b: Resolve conflicts for all objects:
		this.resolveConflictsForObjs(null)

		// Step 2: re-resolve all changed objects, until no more changes are detected:
		while (this.objectsToReResolve.size > 0) {
			if (this.objectResolveCount >= objectResolveCountMax) {
				throw new Error(
					`Maximum conflict iteration reached (${
						this.objectResolveCount
					}). This is due to a circular dependency in the timeline. Latest changes:\n${this.changedObjIdsExplanations.join(
						'Next iteration -------------------------\n'
					)}`
				)
			}

			if (this.debug) {
				this.debugTrace(`---------------------------------`)
				this.debugTrace(`objectsToReResolve: [${Array.from(this.objectsToReResolve.entries())}]`)
				this.debugTrace(
					`directReferences: [${Array.from(this.directReferenceMap.entries()).map(
						([key, value]) => `${key}: [${value}]`
					)}]`
				)
			}

			// Collect and reset all objects that depend on previously changed objects
			const conflictObjectsToResolve: ResolvedTimelineObject[] = []
			for (const obj of this.objectsToReResolve.values()) {
				this.objectResolveCount++

				// Force a new resolve, since the referenced objects might have changed (due to conflicts):
				let needsConflictResolve = false
				if (!obj.resolved.resolvedReferences) {
					this.resolveTimelineObj(obj)
					needsConflictResolve = true
				}
				if (!obj.resolved.resolvedConflicts) {
					needsConflictResolve = true
				}
				if (needsConflictResolve) {
					conflictObjectsToResolve.push(obj)
				}
			}
			// Resolve conflicts for objects that depend on previously changed objects:
			this.resolveConflictsForObjs(conflictObjectsToResolve)
		}

		toc()
	}
	/**
	 * Resolve a timeline-object.
	 * During a resolve, the object.resolved property is populated by instances.
	 * The instances depend on the .enable expressions, as well as parents etc.
	 */
	public resolveTimelineObj(obj: ResolvedTimelineObject): void {
		if (obj.resolved.resolving) throw new Error(`Circular dependency when trying to resolve "${obj.id}"`)
		if (obj.resolved.resolvedReferences) return // already resolved
		const toc = tic('     resolveTimelineObj')
		obj.resolved.resolving = true

		if (!obj.resolved.firstResolved) {
			this.statisticResolvingCount++
		}

		this.debugTrace(`============ resolving "${obj.id}"`)
		const directReferences: Reference[] = []
		let resultingInstances: TimelineObjectInstance[] = []

		if (obj.disabled) {
			resultingInstances = []
		} else {
			// Loop up references to the parent:

			let parentInstances: TimelineObjectInstance[] | null = null
			let hasParent = false
			let parentRef: ObjectReference | undefined = undefined
			if (obj.resolved.parentId) {
				hasParent = true
				parentRef = `#${obj.resolved.parentId}`

				const parentLookup = this.reference.lookupExpression(
					obj,
					this.expression.interpretExpression(parentRef),
					'start'
				)
				// pushToArray(directReferences, parentLookup.allReferences)
				parentInstances = parentLookup.result as TimelineObjectInstance[] | null // a start-reference will always return an array, or null

				if (parentInstances !== null) {
					// Ensure that the parentInstances references the parent:
					for (const parentInstance of parentInstances) {
						parentInstance.references = joinReferences(parentInstance.references, parentRef)
					}
				}
			}

			const enables = ensureArray(obj.enable)
			for (let i = 0; i < enables.length; i++) {
				const enable: TimelineEnable = enables[i]

				// Resolve the the enable.repeating expression:
				const repeatingExpr: Expression | null =
					enable.repeating !== undefined ? this.expression.interpretExpression(enable.repeating) : null
				const lookupRepeating = this.reference.lookupExpression(obj, repeatingExpr, 'duration')
				pushToArray<Reference>(directReferences, lookupRepeating.allReferences)

				let lookedupRepeating: ValueWithReference | null
				if (Array.isArray(lookupRepeating.result)) {
					if (lookupRepeating.result.length === 0) {
						lookedupRepeating = null
					} else if (lookupRepeating.result.length === 1) {
						lookedupRepeating = literal<ValueWithReference>({
							value: lookupRepeating.result[0].start,
							references: lookupRepeating.result[0].references,
						})
					} else {
						// The lookup for repeating returned multiple instances.
						// Not supported at the moment, perhaps this could be supported in the future.
						throw new Error(`lookupExpression should never return an array for .duration lookup`)
					}
				} else {
					lookedupRepeating = lookupRepeating.result
				}

				/** Array of instances this enable-expression resulted in */
				let enableInstances: TimelineObjectInstance[]
				if (enable.while !== undefined) {
					const whileExpr: Expression = this.expression.simplifyExpression(
						// Handle special case "1", 1:
						enable.while === '1' || enable.while === 1
							? 'true'
							: // Handle special case "0", 0:
							enable.while === '0' || enable.while === 0
							? 'false'
							: enable.while
					)
					// Note: a lookup for 'while' works the same as for 'start'
					const lookupWhile = this.reference.lookupExpression(obj, whileExpr, 'start')
					pushToArray<Reference>(directReferences, lookupWhile.allReferences)

					if (Array.isArray(lookupWhile.result)) {
						enableInstances = lookupWhile.result
					} else if (lookupWhile.result !== null) {
						enableInstances = [
							{
								id: this.getInstanceId(),
								start: lookupWhile.result.value,
								end: null,
								references: lookupWhile.result.references,
							},
						]
					} else {
						enableInstances = []
					}
				} else if (enable.start !== undefined) {
					const startExpr: Expression = this.expression.simplifyExpression(enable.start)
					const lookupStart = this.reference.lookupExpression(obj, startExpr, 'start')
					pushToArray<Reference>(directReferences, lookupStart.allReferences)

					// If expression is a constant, it is assumed to be a time relative to it's parent
					const startRefersToParent = hasParent && isConstantExpr(startExpr)

					const lookedupStarts = startRefersToParent
						? this.reference.applyParentInstances(parentInstances, lookupStart.result)
						: lookupStart.result

					const events: EventForInstance[] = []
					// const endEvents: EventForInstance[] = []
					let iStart = 0
					let iEnd = 0
					if (Array.isArray(lookedupStarts)) {
						for (let i = 0; i < lookedupStarts.length; i++) {
							const instance = lookedupStarts[i]
							const eventId = `${obj.id}_${iStart++}`
							events.push({
								time: instance.start,
								value: true,
								data: { instance: instance, id: eventId },
								references: instance.references,
							})
						}
					} else if (lookedupStarts !== null) {
						events.push({
							time: lookedupStarts.value,
							value: true,
							data: {
								instance: {
									id: this.getInstanceId(),
									start: lookedupStarts.value,
									end: null,
									references: lookedupStarts.references,
								},
								id: `${obj.id}_${iStart++}`,
							},
							references: lookedupStarts.references,
						})
					}

					if (enable.end !== undefined) {
						const endExpr: Expression = this.expression.interpretExpression(enable.end)

						const lookupEnd = endExpr ? this.reference.lookupExpression(obj, endExpr, 'end') : null
						if (lookupEnd) pushToArray<Reference>(directReferences, lookupEnd.allReferences)

						// If expression is a constant, it is assumed to be a time relative to it's parent
						const endRefersToParent = hasParent && isConstantExpr(endExpr)

						/** Contains an inverted list of instances. Therefore .start means an end */
						const lookedupEnds = !lookupEnd
							? null
							: endRefersToParent
							? this.reference.applyParentInstances(parentInstances, lookupEnd.result)
							: lookupEnd.result

						if (Array.isArray(lookedupEnds)) {
							for (let i = 0; i < lookedupEnds.length; i++) {
								const instance = lookedupEnds[i]
								events.push({
									time: instance.start,
									value: false,
									data: { instance: instance, id: `${obj.id}_${iEnd++}` },
									references: instance.references,
								})
							}
						} else if (lookedupEnds !== null) {
							events.push({
								time: lookedupEnds.value,
								value: false,
								data: {
									instance: {
										id: this.getInstanceId(),
										start: lookedupEnds.value,
										end: null,
										references: lookedupEnds.references,
									},
									id: `${obj.id}_${iEnd++}`,
								},
								references: lookedupEnds.references,
							})
						}
					} else if (enable.duration !== undefined) {
						const durationExpr: Expression = this.expression.interpretExpression(enable.duration)
						const lookupDuration = this.reference.lookupExpression(obj, durationExpr, 'duration')
						pushToArray<Reference>(directReferences, lookupDuration.allReferences)

						let lookedupDuration = lookupDuration.result
						if (Array.isArray(lookedupDuration) && lookedupDuration.length === 1) {
							lookedupDuration = literal<ValueWithReference>({
								value: lookedupDuration[0].start,
								references: lookedupDuration[0].references,
							})
						}
						if (Array.isArray(lookedupDuration) && !lookedupDuration.length) lookedupDuration = null

						if (Array.isArray(lookedupDuration)) {
							// Lookup rendeded multiple durations.
							// This is unsupported at the moment, but could possibly be added in the future.
							throw new Error(`lookupExpression should never return an array for .duration lookup`)
						} else if (lookedupDuration !== null) {
							if (lookedupRepeating !== null && lookedupDuration.value > lookedupRepeating.value) {
								// Cap duration to repeating duration
								lookedupDuration.value = lookedupRepeating.value
							}

							const tmpLookedupDuration: ValueWithReference = lookedupDuration // cast type

							for (let i = 0; i < events.length; i++) {
								const e = events[i]

								if (e.value) {
									const time = e.time + tmpLookedupDuration.value
									const references = joinReferences(e.references, tmpLookedupDuration.references)
									events.push({
										time: time,
										value: false,
										data: {
											id: e.data.id,
											instance: {
												id: e.data.instance.id,
												start: time,
												end: null,
												references: references,
											},
										},
										references: references,
									})
								}
							}
						}
					}

					enableInstances = this.instance.convertEventsToInstances(
						events,
						false,
						false,
						// Omit the referenced originalStart/End when using enable.start:
						true
					)

					// Cap those instances to the parent instances:
					if (parentRef && parentInstances !== null) {
						const parentInstanceMap = new Map<InstanceId, TimelineObjectInstance>()
						for (const instance of parentInstances) {
							parentInstanceMap.set(instance.id, instance)
						}

						const cappedEnableInstances: TimelineObjectInstance[] = []
						for (const instance of enableInstances) {
							let matchedParentInstance: TimelineObjectInstance | undefined = undefined
							// Go through the references in reverse, because sometimes there are multiple matches, and the last one is probably the one we want to use.
							for (let i = instance.references.length - 1; i >= 0; i--) {
								const ref = instance.references[i]
								if (isInstanceReference(ref)) {
									matchedParentInstance = parentInstanceMap.get(getRefInstanceId(ref))
									if (matchedParentInstance) break
								}
							}
							if (matchedParentInstance) {
								const cappedInstance = this.instance.capInstance(instance, matchedParentInstance)
								if (!cappedInstance.caps) cappedInstance.caps = []
								cappedInstance.caps.push(
									literal<Cap>({
										id: matchedParentInstance.id,
										start: matchedParentInstance.start,
										end: matchedParentInstance.end,
									})
								)
								cappedEnableInstances.push(cappedInstance)
							} else {
								cappedEnableInstances.push(instance)
							}
						}
						enableInstances = cappedEnableInstances
					}
				} else {
					enableInstances = []
				}

				enableInstances = this.instance.applyRepeatingInstances(enableInstances, lookedupRepeating)

				pushToArray<TimelineObjectInstance>(resultingInstances, enableInstances)
			}

			// Cap the instances to the parent instances:
			if (hasParent) {
				resultingInstances = this.capInstancesToParentInstances({
					instances: resultingInstances,
					parentInstances,
				})
			}
		}

		// Make the instance ids unique:
		const idSet = new Set<string>()
		for (const instance of resultingInstances) {
			if (idSet.has(instance.id)) {
				instance.id = `${instance.id}_${this.getInstanceId()}`
			}
			idSet.add(instance.id)
		}

		if (obj.seamless && resultingInstances.length > 1) {
			resultingInstances = this.instance.cleanInstances(resultingInstances, true, false)
		}

		if (obj.resolved.parentId) {
			directReferences.push(`#${obj.resolved.parentId}`)
		}

		if (!obj.resolved.firstResolved) {
			// This only needs to be done upon first resolve:
			this.updateDirectReferenceMap(obj, directReferences)
		}

		obj.resolved.firstResolved = true
		obj.resolved.resolvedReferences = true
		obj.resolved.resolving = false
		obj.resolved.instances = resultingInstances

		if (this.debug) {
			this.debugTrace(`directReferences "${obj.id}": ${JSON.stringify(directReferences)}`)
			this.debugTrace(`resolved "${obj.id}": ${JSON.stringify(obj.resolved.instances)}`)
		}

		// Finally:
		obj.resolved.resolving = false
		toc()
	}
	public getStatistics(): ResolvedTimeline['statistics'] {
		const toc = tic('  getStatistics')
		const statistics: ResolvedTimeline['statistics'] = {
			unresolvedCount: 0,
			resolvedCount: 0,
			resolvedInstanceCount: 0,
			resolvedObjectCount: 0,
			resolvedGroupCount: 0,
			resolvedKeyframeCount: 0,

			resolvingCount: this.statisticResolvingCount,
		}

		for (const obj of this.objectsMap.values()) {
			if (obj.resolved.resolvedReferences) {
				statistics.resolvedCount += 1
				if (obj.isGroup) {
					statistics.resolvedGroupCount += 1
				}
				if (obj.resolved.isKeyframe) {
					statistics.resolvedKeyframeCount += 1
				} else {
					statistics.resolvedObjectCount += 1
				}
				statistics.resolvedInstanceCount += obj.resolved.instances.length
			} else {
				statistics.unresolvedCount += 1
			}
		}
		toc()

		return statistics
	}
	public initializeCache(cacheObj: Partial<ResolverCache>): CacheHandler {
		this.cache = new CacheHandler(cacheObj, this)
		return this.cache
	}
	/**
	 * Returns an object.
	 * type-wise, assumes you know what object you're looking for
	 */
	public getObject(objId: string): ResolvedTimelineObject {
		return this.objectsMap.get(objId) as ResolvedTimelineObject
	}
	/**
	 * Returns object ids on a layer
	 * type-wise, assumes you know what layer you're looking for
	 */
	public getLayerObjects(layer: string): string[] {
		return this.layersMap.get(layer) as string[]
	}
	/**
	 * Returns object ids on a layer
	 * type-wise, assumes you know what className you're looking for
	 */
	public getClassObjects(className: string): string[] {
		return this.classesMap.get(className) as string[]
	}
	public capInstancesToParentInstances(arg: {
		instances: TimelineObjectInstance[]
		parentInstances: TimelineObjectInstance[] | null
	}): TimelineObjectInstance[] {
		if (!arg.parentInstances) return []

		const events: InstanceEvent<{
			instance: TimelineObjectInstance
			isParent: boolean
		}>[] = []
		for (const instance of arg.instances) {
			events.push({
				time: instance.start,
				value: true,
				references: instance.references,
				data: { instance, isParent: false },
			})

			if (instance.end !== null) {
				events.push({
					time: instance.end,
					value: false,
					references: instance.references,
					data: { instance, isParent: false },
				})
			}
		}
		for (const instance of arg.parentInstances) {
			events.push({
				time: instance.start,
				value: true,
				references: instance.references,
				data: { instance, isParent: true },
			})

			if (instance.end !== null) {
				events.push({
					time: instance.end,
					value: false,
					references: instance.references,
					data: { instance, isParent: true },
				})
			}
		}
		sortEvents(events, (a, b) => {
			// start event be first:
			if (a.value && !b.value) return -1
			if (!a.value && b.value) return 1

			if (a.value) {
				// start: parents first:
				if (a.data.isParent && !b.data.isParent) return -1
				if (!a.data.isParent && b.data.isParent) return 1
			} else {
				// end: parents last:
				if (a.data.isParent && !b.data.isParent) return 1
				if (!a.data.isParent && b.data.isParent) return -1
			}

			// parents first:
			// if (a.data.isParent && !b.data.isParent) return -1
			// if (!a.data.isParent && b.data.isParent) return 1

			return 0
		})

		const parentActiveInstances: TimelineObjectInstance[] = []
		const childActiveInstances: TimelineObjectInstance[] = []
		let currentActive:
			| {
					instance: TimelineObjectInstance
					parent: TimelineObjectInstance
			  }
			| undefined = undefined

		const cappedInstances: TimelineObjectInstance[] = []
		function finalizeCurrentActive() {
			if (currentActive) {
				cappedInstances.push(currentActive.instance)
				currentActive = undefined
			}
		}

		for (const event of events) {
			if (event.data.isParent) {
				// Parent instance
				if (event.value) {
					parentActiveInstances.push(event.data.instance)
				} else {
					spliceInstances(parentActiveInstances, (i) => (i === event.data.instance ? undefined : i))
				}
			} else {
				// Child instance
				if (event.value) {
					childActiveInstances.push(event.data.instance)
				} else {
					spliceInstances(childActiveInstances, (i) => (i === event.data.instance ? undefined : i))
				}
			}

			const childInstance = childActiveInstances[childActiveInstances.length - 1]
			const parentInstance = parentActiveInstances[parentActiveInstances.length - 1]

			/** If there is an active child instance */
			const toBeEnabled = Boolean(childInstance && parentInstance)

			if (toBeEnabled) {
				if (currentActive) {
					if (
						// Check if instance is still the same:
						childInstance.id !== currentActive.instance.id ||
						(parentInstance !== currentActive.parent &&
							// Check if parent still is active:
							!parentActiveInstances.includes(currentActive.parent))
					) {
						// parent isn't active anymore, stop and start a new instance:

						// Stop instance:
						currentActive.instance.end = event.time
						currentActive.instance.originalEnd = currentActive.instance.originalEnd ?? event.time
						currentActive.instance.references = joinReferences(
							currentActive.instance.references,
							event.data.instance.references
						)
						finalizeCurrentActive()
					} else {
						// Continue an active instance
						if (currentActive.instance.id !== childInstance.id) {
							currentActive.instance.references = joinReferences(
								currentActive.instance.references,
								childInstance.references
							)
						}
					}
				}
				if (!currentActive) {
					// Start a new instance:
					currentActive = {
						instance: {
							...childInstance,
							start: event.time,
							end: null, // set later
							// originalStart: childInstance.originalStart ?? event.time,
							// originalEnd: childInstance.originalEnd ?? null, // set later
							originalStart: childInstance.originalStart ?? childInstance.start,
							originalEnd: childInstance.originalEnd ?? childInstance.end ?? null, // set later
							references: joinReferences(
								childInstance.references,
								...parentActiveInstances.map((i) => i.references)
							),
						},
						parent: parentInstance,
					}
				}
			} else {
				if (currentActive) {
					// Stop instance:

					currentActive.instance.end = event.time
					currentActive.instance.originalEnd = currentActive.instance.originalEnd ?? event.time
					currentActive.instance.references = joinReferences(
						currentActive.instance.references,
						event.data.instance.references
					)
					finalizeCurrentActive()
				}
			}
		}

		finalizeCurrentActive()

		return cappedInstances
	}
	private updateDirectReferenceMap(obj: ResolvedTimelineObject, directReferences: Reference[]) {
		obj.resolved.directReferences = directReferences

		for (const ref of directReferences) {
			const objectsThisIsReferencing: string[] = []
			if (isObjectReference(ref)) {
				const objId = getRefObjectId(ref)
				objectsThisIsReferencing.push(objId)
			} else if (isClassReference(ref)) {
				const className = getRefClass(ref)
				for (const objId of this.getClassObjects(className) ?? []) {
					objectsThisIsReferencing.push(objId)
				}
			} else if (isLayerReference(ref)) {
				const layer = getRefLayer(ref)
				for (const objId of this.getLayerObjects(layer) ?? []) {
					objectsThisIsReferencing.push(objId)
				}
			} else if (isInstanceReference(ref)) {
				// ignore
			} else {
				assertNever(ref)
			}

			for (const refObjId of objectsThisIsReferencing) {
				let refs = this.directReferenceMap.get(refObjId)
				if (!refs) {
					refs = []
					this.directReferenceMap.set(refObjId, refs)
				}
				refs.push(obj.id)
			}
		}
	}
	private getObjectsLayers(objs: IterableIterator<ResolvedTimelineObject> | ResolvedTimelineObject[]): string[] {
		const layers = new Set<string>()

		for (const obj of objs) {
			if (objHasLayer(obj)) {
				layers.add(`${obj.layer}`)
			}
		}

		return Array.from(layers.values())
	}
	private allObjectLayersCache: string[] | undefined
	/** Returns a list of all object's layers */
	private getAllObjectLayers(): string[] {
		if (!this.allObjectLayersCache) {
			// Cache this, since this won't change:
			this.allObjectLayersCache = this.getObjectsLayers(this.objectsMap.values())
		}
		return this.allObjectLayersCache
	}

	private _addTimelineObject(
		obj: TimelineObject,
		/** A number that increases the more levels inside of a group the objects is. 0 = no parent */
		levelDeep: number,
		/** ID of the parent object */
		parentId: string | undefined,
		isKeyframe: boolean
	): void {
		const toc = tic('  addTimelineObject')

		// Is it already added?
		if (!this.options.skipValidation) {
			if (this.objectsMap.has(obj.id)) {
				throw Error(`All timelineObjects must be unique! (duplicate: "${obj.id}")`)
			}
		}

		// Add the object:
		{
			const o: ResolvedTimelineObject = {
				...obj,
				resolved: {
					firstResolved: false,
					resolvedReferences: false,
					resolvedConflicts: false,
					resolving: false,
					instances: [],
					levelDeep: levelDeep,
					isSelfReferencing: false,
					directReferences: [],
					parentId: parentId,
					isKeyframe: isKeyframe,
				},
			}
			this.objectsMap.set(obj.id, o)

			if (obj.classes) {
				for (let i = 0; i < obj.classes.length; i++) {
					const className: string = obj.classes[i]

					if (className) {
						let classList = this.classesMap.get(className)
						if (!classList) {
							classList = []
							this.classesMap.set(className, classList)
						}
						classList.push(obj.id)
					}
				}
			}
			if (objHasLayer(obj)) {
				const layer = `${obj.layer}`

				let layerList = this.layersMap.get(layer)
				if (!layerList) {
					layerList = []
					this.layersMap.set(layer, layerList)
				}
				layerList.push(obj.id)
			}
		}

		// Go through children and keyframes:
		{
			// Add children:
			if (obj.isGroup && obj.children) {
				for (let i = 0; i < obj.children.length; i++) {
					const child = obj.children[i]
					this._addTimelineObject(child, levelDeep + 1, obj.id, false)
				}
			}
			// Add keyframes:
			if (obj.keyframes) {
				for (let i = 0; i < obj.keyframes.length; i++) {
					const keyframe = obj.keyframes[i]
					const kf2: TimelineObjectKeyframe = {
						...keyframe,
						layer: '',
					}

					this._addTimelineObject(kf2, levelDeep + 1, obj.id, true)
				}
			}
		}
		toc()
	}

	/**
	 * Resolve conflicts for all layers of the provided objects
	 */
	private resolveConflictsForObjs(
		/** null means all layers */
		objs: ResolvedTimelineObject[] | null
	): void {
		const toc = tic('     resolveConflictsForObjs')

		// These need to be cleared,
		// as they are populated during the this.updateObjectsToReResolve() below:
		this.changedObjIdsExplanations = []
		this.objectsToReResolve.clear()

		/** List of layers to resolve conflicts on */
		let layers: string[]
		if (objs === null) {
			layers = this.getAllObjectLayers()
		} else {
			layers = this.getObjectsLayers(objs)
		}

		for (const layer of layers) {
			const maybeChangedObjs = this.resolveConflictsForLayer(layer)

			// run this.updateObjectsToReResolve() here (as opposed to outside the loop),
			// to allow for a fast-path in resolveConflictsForLayer that skips resolving that layer if it contains
			// objects that depend on already changed objects.
			this.updateObjectsToReResolve(maybeChangedObjs)
		}

		toc()
	}
	/**
	 * Resolve conflicts for a layer
	 * @returns A list of objects on that layer
	 */
	private resolveConflictsForLayer(layer: string): ResolvedTimelineObject[] {
		const handler = new LayerStateHandler(this, this.instance, layer)

		// Fast path: If an object on this layer depends on an already changed object we should skip this layer, this iteration.
		// Because the objects will likely change during the next resolve-iteration anyway.
		for (const objId of handler.objectIdsOnLayer) {
			if (this.objectsToReResolve.has(objId)) {
				this.debugTrace(`optimization: Skipping "${layer}" since "${objId}" changed`)
				return []
			}
		}

		handler.resolveConflicts()

		return handler.objectsOnLayer
	}

	private _idCount = 0
	/** Returns the next unique instance id */
	getInstanceId(): InstanceId {
		return `@${(this._idCount++).toString(36)}`
	}

	private updateObjectsToReResolve(maybeChangedObjs: ResolvedTimelineObject[]) {
		const toc = tic('     updateObjectsToReResolve')

		const changedObjs = new Set<string>()

		for (const obj of maybeChangedObjs) {
			// Check if the instances have changed:

			const instancesHash = getInstancesHash(obj.resolved.instances)
			const prevHash = this.resolvedObjInstancesHash.get(obj.id) ?? 'not-found'

			if (instancesHash !== prevHash) {
				this.changedObjIdsExplanations.push(
					`"${obj.id}" changed from: \n   ${prevHash}\n   , to \n   ${instancesHash}\n`
				)
				if (this.changedObjIdsExplanations.length > 2) this.changedObjIdsExplanations.shift()

				this.debugTrace(`changed: ${obj.id}: "${prevHash}" -> "${instancesHash}"`)
				changedObjs.add(obj.id)

				this.resolvedObjInstancesHash.set(obj.id, instancesHash)
			}
		}

		for (const changedObjId of changedObjs.values()) {
			// Find all objects that depend on this:
			const directReferences = this.directReferenceMap.get(changedObjId) ?? []
			for (const objId of directReferences) {
				const obj = this.getObject(objId)

				obj.resolved.resolvedReferences = false
				// Note: obj.resolved.resolvedConflicts will be set to false later when resolving references

				this.objectsToReResolve.set(obj.id, obj)
			}
		}
		toc()
	}

	private debugTrace(...args: any[]) {
		if (this.debug) console.log(...args)
	}
}
export interface TimelineObjectKeyframe extends TimelineObject, TimelineKeyframe {}
