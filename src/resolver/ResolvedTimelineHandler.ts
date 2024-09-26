import { ExpressionHandler } from './ExpressionHandler'
import { ObjectRefType, ReferenceHandler } from './ReferenceHandler'
import { Expression } from '../api/expression'
import { ResolvedTimeline, ResolvedTimelineObject, TimelineObjectInstance } from '../api/resolvedTimeline'
import { Content, TimelineEnable, TimelineKeyframe, TimelineObject } from '../api/timeline'
import { assertNever, ensureArray, isArray, literal, pushToArray } from './lib/lib'
import { InstanceHandler } from './InstanceHandler'
import {
	ValueWithReference,
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
import { Cap, InstanceId, ObjectReference, Reference, ResolveOptions, ResolverCache } from '../api'
import { getInstancesHash, spliceInstances } from './lib/instance'
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
export class ResolvedTimelineHandler<TContent extends Content = Content> {
	/** Maps object id to object */
	public objectsMap = new Map<string, ResolvedTimelineObject<TContent>>()
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
	private statisticResolvingObjectCount = 0

	/** How many times an object where resolved. (is affected when using cache) */
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

	/** Error message, is set when an error is encountered and this.options.dontThrowOnError is set */
	private _resolveError: Error | undefined = undefined

	constructor(public options: ResolveOptions) {
		this.expression = new ExpressionHandler(false, this.options.skipValidation)
		this.instance = new InstanceHandler(this)
		this.reference = new ReferenceHandler(this, this.instance)

		this.debug = this.options.debug ?? false
	}
	public get resolveError(): Error | undefined {
		return this._resolveError
	}

	/** Populate ResolvedTimelineHandler with a timeline-object. */
	public addTimelineObject(obj: TimelineObject<TContent>): void {
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
		if (this._resolveError) return // Abort on error

		// Step 1b: Resolve conflicts for all objects:
		this.resolveConflictsForObjs(null)

		if (this._resolveError) return // Abort on error

		// Step 2: re-resolve all changed objects, until no more changes are detected:
		while (this.objectsToReResolve.size > 0) {
			if (this.objectResolveCount >= objectResolveCountMax) {
				const error = new Error(
					`Maximum conflict iteration reached (${
						this.objectResolveCount
					}). This is due to a circular dependency in the timeline. Latest changes:\n${this.changedObjIdsExplanations.join(
						'Next iteration -------------------------\n'
					)}`
				)
				if (this.options.dontThrowOnError) {
					this._resolveError = error
					return
				} else {
					throw error
				}
			}

			/* istanbul ignore if */
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
			if (this._resolveError) return // Abort on error

			// Resolve conflicts for objects that depend on previously changed objects:
			this.resolveConflictsForObjs(conflictObjectsToResolve)
		}

		toc()
	}
	/**
	 * Resolve a timeline-object.
	 * The Resolve algorithm works like this:
	 * 1. Go through the .enable expression(s) and look up all referenced objects.
	 * 	  1.5 For each referenced object, recursively resolve it first if not already resolved.
	 * 2. Collect the resolved instances and calculate the resulting list of resulting instances.
	 */
	public resolveTimelineObj(obj: ResolvedTimelineObject): void {
		if (obj.resolved.resolving) {
			// Circular dependency

			const error = Error(`Circular dependency when trying to resolve "${obj.id}"`)

			if (this.options.dontThrowOnError) {
				this._resolveError = error
				obj.resolved.firstResolved = true
				obj.resolved.resolvedReferences = true
				obj.resolved.resolving = false
				obj.resolved.instances = []
				return
			} else {
				throw error
			}
		}
		if (obj.resolved.resolvedReferences) return // already resolved
		const toc = tic('     resolveTimelineObj')
		obj.resolved.resolving = true

		this.statisticResolvingCount++
		if (!obj.resolved.firstResolved) {
			this.statisticResolvingObjectCount++
		}

		this.debugTrace(`============ resolving "${obj.id}"`)
		const directReferences: Reference[] = []
		let resultingInstances: TimelineObjectInstance[] = []

		if (obj.disabled) {
			resultingInstances = []
		} else {
			// Look up references to the parent:
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
				const lookupRepeating =
					enable.repeating !== undefined
						? this.lookupExpression(obj, directReferences, enable.repeating, 'duration')
						: { result: null }

				let lookedupRepeating: ValueWithReference | null
				if (lookupRepeating.result === null) {
					// Do nothing
					lookedupRepeating = null
				} else if (isArray(lookupRepeating.result)) {
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
						/* istanbul ignore next */
						throw new Error(`lookupExpression should never return an array for .duration lookup`)
					}
				} else {
					lookedupRepeating = lookupRepeating.result
				}

				/** Array of instances this enable-expression resulted in */
				let enableInstances: TimelineObjectInstance[]
				if (enable.while !== undefined) {
					const whileExpr: Expression =
						// Handle special case "1", 1:
						enable.while === '1' || enable.while === 1
							? 'true'
							: // Handle special case "0", 0:
							enable.while === '0' || enable.while === 0
							? 'false'
							: enable.while

					// Note: a lookup for 'while' works the same as for 'start'
					const lookupWhile = this.lookupExpression(obj, directReferences, whileExpr, 'start')

					if (lookupWhile.result === null) {
						// Do nothing
						enableInstances = []
					} else if (isArray(lookupWhile.result)) {
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
					const lookupStart = this.lookupExpression(obj, directReferences, enable.start, 'start')

					const lookedupStarts = lookupStart.refersToParent
						? this.reference.applyParentInstances(parentInstances, lookupStart.result)
						: lookupStart.result

					const events: EventForInstance[] = []
					// const endEvents: EventForInstance[] = []
					let iStart = 0
					let iEnd = 0
					if (lookedupStarts === null) {
						// Do nothing
					} else if (isArray(lookedupStarts)) {
						// Use the start-times of the instances and add them to the list of events:
						// (The end-times are irrelevant)
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
					} else {
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
						const lookupEnd = this.lookupExpression(obj, directReferences, enable.end, 'end')

						/** Contains an inverted list of instances. Therefore .start means an end */
						const lookedupEnds = !lookupEnd
							? null
							: lookupEnd.refersToParent
							? this.reference.applyParentInstances(parentInstances, lookupEnd.result)
							: lookupEnd.result

						if (lookedupEnds === null) {
							// Do nothing
						} else if (isArray(lookedupEnds)) {
							// Use the start-times of the instances and add them (as end-events) to the list:
							// (The end-times are irrelevant)
							for (let i = 0; i < lookedupEnds.length; i++) {
								const instance = lookedupEnds[i]
								events.push({
									time: instance.start,
									value: false,
									data: { instance: instance, id: `${obj.id}_${iEnd++}` },
									references: instance.references,
								})
							}
						} else if (lookedupEnds) {
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
						const lookupDuration = this.lookupExpression(obj, directReferences, enable.duration, 'duration')

						let lookedupDuration = lookupDuration.result

						if (lookedupDuration === null) {
							// Do nothing
						} else if (isArray(lookedupDuration)) {
							if (lookedupDuration.length === 1) {
								lookedupDuration = literal<ValueWithReference>({
									value: lookedupDuration[0].start,
									references: lookedupDuration[0].references,
								})
							} else if (lookedupDuration.length === 0) {
								lookedupDuration = null
							} else {
								// Lookup rendeded multiple durations.
								// This is unsupported at the moment, but could possibly be added in the future.
								/* istanbul ignore next */
								throw new Error(`lookedupDuration should never return an array for .duration lookup`)
							}
						}

						if (lookedupDuration !== null) {
							if (lookedupRepeating !== null && lookedupDuration.value > lookedupRepeating.value) {
								// Cap duration to repeating duration
								lookedupDuration.value = lookedupRepeating.value
							}

							// Go through all pre-existing start-events, and add end-events for each of them.
							for (let i = 0; i < events.length; i++) {
								const startEvent = events[i]

								if (startEvent.value) {
									// Is a start-event

									const time = startEvent.time + lookedupDuration.value
									const references = joinReferences(
										startEvent.references,
										lookedupDuration.references
									)
									events.push({
										time: time,
										value: false,
										data: {
											id: startEvent.data.id,
											instance: {
												id: startEvent.data.instance.id,
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

				// Add the instances resulting from this enable-expression to the list:
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
		if (this.options.skipStatistics) {
			return {
				totalCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0,
				resolvingObjectCount: 0,
				resolvingCount: 0,
			}
		}
		const statistics: ResolvedTimeline['statistics'] = {
			totalCount: 0,
			resolvedInstanceCount: 0,
			resolvedObjectCount: 0,
			resolvedGroupCount: 0,
			resolvedKeyframeCount: 0,

			resolvingObjectCount: this.statisticResolvingObjectCount,
			resolvingCount: this.statisticResolvingCount,
		}

		for (const obj of this.objectsMap.values()) {
			statistics.totalCount += 1
			if (obj.isGroup) {
				statistics.resolvedGroupCount += 1
			}
			if (obj.resolved.isKeyframe) {
				statistics.resolvedKeyframeCount += 1
			} else {
				statistics.resolvedObjectCount += 1
			}
			statistics.resolvedInstanceCount += obj.resolved.instances.length
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
		sortEvents(events, compareEvents)

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
	public getResolvedTimeline(): ResolvedTimeline<TContent> {
		return literal<ResolvedTimeline<TContent>>({
			objects: mapToObject(this.objectsMap),
			classes: mapToObject(this.classesMap),
			layers: mapToObject(this.layersMap),
			nextEvents: this.getNextEvents(),

			statistics: this.getStatistics(),

			error: this.resolveError,
		})
	}
	private getNextEvents(): NextEvent[] {
		const toc = tic('  getNextEvents')
		const nextEvents: NextEvent[] = []

		const allObjects: ResolvedTimelineObject[] = []
		const allKeyframes: ResolvedTimelineObject[] = []

		for (const obj of this.objectsMap.values()) {
			if (obj.resolved.isKeyframe) {
				allKeyframes.push(obj)
			} else {
				allObjects.push(obj)
			}
		}

		/** Used to fast-track in cases where there are no keyframes */
		const hasKeyframes = allKeyframes.length > 0

		const objectInstanceStartTimes = new Set<string>()
		const objectInstanceEndTimes = new Set<string>()

		// Go through keyframes last:
		for (const obj of [...allObjects, ...allKeyframes]) {
			if (!obj.resolved.isKeyframe) {
				if (!objHasLayer(obj)) continue // transparent objects are omitted in NextEvents
			} else if (obj.resolved.parentId !== undefined) {
				const parentObj = this.getObject(obj.resolved.parentId)
				if (parentObj) {
					/* istanbul ignore if */
					if (!objHasLayer(parentObj)) continue // Keyframes of transparent objects are omitted in NextEvents
				}
			}

			for (let i = 0; i < obj.resolved.instances.length; i++) {
				const instance = obj.resolved.instances[i]
				if (instance.start > this.options.time && instance.start < (this.options.limitTime ?? Infinity)) {
					let useThis = true

					if (hasKeyframes) {
						if (!obj.resolved.isKeyframe) {
							objectInstanceStartTimes.add(`${obj.id}_${instance.start}`)
						} else {
							// No need to put keyframe event if its parent starts at the same time:
							if (objectInstanceStartTimes.has(`${obj.resolved.parentId}_${instance.start}`)) {
								useThis = false
							}
						}
					}

					if (useThis) {
						nextEvents.push({
							objId: obj.id,
							type: obj.resolved.isKeyframe ? EventType.KEYFRAME : EventType.START,
							time: instance.start,
						})
					}
				}
				if (
					instance.end !== null &&
					instance.end > this.options.time &&
					instance.end < (this.options.limitTime ?? Infinity)
				) {
					let useThis = true
					if (hasKeyframes) {
						if (!obj.resolved.isKeyframe) {
							objectInstanceEndTimes.add(`${obj.id}_${instance.end}`)
						} else {
							// No need to put keyframe event if its parent ends at the same time:
							if (objectInstanceEndTimes.has(`${obj.resolved.parentId}_${instance.end}`)) {
								useThis = false
							}
						}
					}

					if (useThis) {
						nextEvents.push({
							objId: obj.id,
							type: obj.resolved.isKeyframe ? EventType.KEYFRAME : EventType.END,
							time: instance.end,
						})
					}
				}
			}
		}
		nextEvents.sort(compareNextEvents)

		toc()
		return nextEvents
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
			} else if (
				/* istanbul ignore next */
				isInstanceReference(ref)
			) {
				// do nothing
			} else {
				/* istanbul ignore next */
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
	private getLayersForObjects(objs: IterableIterator<ResolvedTimelineObject> | ResolvedTimelineObject[]): string[] {
		const sortedLayers = this.getAllObjectLayers()

		/** Map of layer and object count */
		const usedLayers = new Set<string>()

		for (const obj of objs) {
			if (objHasLayer(obj)) {
				usedLayers.add(`${obj.layer}`)
			}
		}
		// Return the layers that are used by the objects, in the correct order:
		return sortedLayers.filter((layer) => usedLayers.has(layer))
	}
	/** Cache of all layers, sorted by object count ASC */
	private allObjectLayersCache: string[] | undefined
	/**
	 * Returns a list of all object's layers, sorted by object count ASC
	 * Note: The order of the layers is important from a performance perspective.
	 * By feeding layers with a low object count first into this.resolveConflictsForLayer(),
	 * there is a higher likelihood that a conflict from a low-count layer will affect an object on
	 * a high-count layer, so it can be skipped in this iteration.
	 */
	private getAllObjectLayers(): string[] {
		if (!this.allObjectLayersCache) {
			// Cache this, since this won't change:

			// Sort the layers by count ASC:
			this.allObjectLayersCache = Array.from(this.layersMap.entries())
				.sort((a, b) => a[1].length - b[1].length)
				.map(([layer, _count]) => layer)
		}
		return this.allObjectLayersCache
	}

	/** Look up an expression, update references and return it. */
	private lookupExpression(
		obj: ResolvedTimelineObject,
		directReferences: Reference[],
		expr: Expression,
		context: ObjectRefType
	) {
		const simplifiedExpression: Expression = this.expression.simplifyExpression(expr)
		const lookupResult = this.reference.lookupExpression(obj, simplifiedExpression, context)
		pushToArray<Reference>(directReferences, lookupResult.allReferences)

		// If expression is a constant, it is assumed to be a time relative to its parent:
		const refersToParent = obj.resolved.parentId && isConstantExpr(simplifiedExpression)

		return {
			allReferences: lookupResult.allReferences,
			result: lookupResult.result,
			refersToParent,
		}
	}

	private _addTimelineObject(
		obj: TimelineObject<TContent>,
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
				/* istanbul ignore next */
				throw Error(`All timelineObjects must be unique! (duplicate: "${obj.id}")`)
			}
		}

		// Add the object:
		{
			const o: ResolvedTimelineObject<TContent> = {
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
					const child = obj.children[i] as TimelineObject<TContent>
					this._addTimelineObject(child, levelDeep + 1, obj.id, false)
				}
			}
			// Add keyframes:
			if (obj.keyframes) {
				for (let i = 0; i < obj.keyframes.length; i++) {
					const keyframe = obj.keyframes[i]
					const kf2: TimelineObjectKeyframe<any> = {
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
			layers = this.getLayersForObjects(objs)
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

function compareEvents<T extends InstanceEvent>(a: T, b: T): number {
	// start event be first:
	const aValue = a.value
	const bValue = b.value
	if (aValue && !bValue) return -1
	if (!aValue && bValue) return 1

	const aIsParent = a.data.isParent
	const bIsParent = b.data.isParent
	if (aValue) {
		// start: parents first:
		if (aIsParent && !bIsParent) return -1
		if (!aIsParent && bIsParent) return 1
	} else {
		// end: parents last:
		if (aIsParent && !bIsParent) return 1
		if (!aIsParent && bIsParent) return -1
	}

	// parents first:
	// if (a.data.isParent && !b.data.isParent) return -1
	// if (!a.data.isParent && b.data.isParent) return 1

	return 0
}
export interface TimelineObjectKeyframe<TContent extends Content = Content>
	extends TimelineObject<TContent>,
		TimelineKeyframe<TContent> {}
function compareNextEvents(a: NextEvent, b: NextEvent): number {
	return a.time - b.time || b.type - a.type || compareStrings(a.objId, b.objId)
}
