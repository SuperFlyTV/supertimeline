import * as _ from 'underscore'
import {
	TimelineObject,
	ResolvedTimeline,
	ResolveOptions,
	Expression,
	ResolvedTimelineObject,
	TimelineObjectInstance,
	Time,
	TimelineState,
	TimelineKeyframe,
	TimelineObjectKeyframe,
	ValueWithReference,
	InstanceEvent,
	Cap,
	ResolvedStates,
	ResolverCacheInternal,
	ResolvedTimelineObjects,
	ResolverCache,
	TimelineEnable
 } from '../api/api'
import {
	extendMandadory,
	operateOnArrays,
	isNumeric,
	applyRepeatingInstances,
	sortEvents,
	cleanInstances,
	invertInstances,
	capInstances,
	joinReferences,
	isReference,
	convertEventsToInstances,
	EventForInstance,
	getId,
	isConstant,
	resetId,
	applyParentInstances
} from '../lib'
import { validateTimeline } from './validate'
import { interpretExpression, simplifyExpression } from './expression'
import { getState, resolveStates } from './state'
import { addObjectToResolvedTimeline } from './common'
import { objectHash, initializeCache, getObjectReferences } from './cache'

export class Resolver {

	/**
	 * Go through all objects on the timeline and calculate all the timings.
	 * Returns a ResolvedTimeline which can be piped into Resolver.getState()
	 * @param timeline Array of timeline objects
	 * @param options Resolve options
	 */
	static resolveTimeline (timeline: Array<TimelineObject>, options: ResolveOptions): ResolvedTimeline {
		if (!_.isArray(timeline)) throw new Error('resolveTimeline: parameter timeline missing')
		if (!options) throw new Error('resolveTimeline: parameter options missing')

		validateTimeline(timeline, false)
		resetId()

		const resolvedTimeline: ResolvedTimeline = {
			options: { ...options },
			objects: {},
			classes: {},
			layers: {},
			statistics: {
				unresolvedCount: 0,
				resolvedCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0,
				resolvingCount: 0
			}
		}
		// Step 1: pre-populate resolvedTimeline with objects
		const addToResolvedTimeline = (
			obj: TimelineObject,
			levelDeep: number,
			parentId?: string,
			isKeyframe?: boolean
		) => {
			if (resolvedTimeline.objects[obj.id]) throw Error(`All timelineObjects must be unique! (duplicate: "${obj.id}")`)

			const o: ResolvedTimelineObject = extendMandadory<TimelineObject, ResolvedTimelineObject>(_.clone(obj), {
				resolved: {
					resolved: false,
					resolving: false,
					instances: [],
					levelDeep: levelDeep,
					isSelfReferencing: false,
					directReferences: []
				}
			})
			if (parentId) {
				o.resolved.parentId = parentId
				o.resolved.directReferences.push(parentId)
			}
			if (isKeyframe) o.resolved.isKeyframe = true

			addObjectToResolvedTimeline(resolvedTimeline, o)

			// Add children:
			if (obj.isGroup && obj.children) {
				for (let i = 0; i < obj.children.length; i++) {
					const child = obj.children[i]
					addToResolvedTimeline(child, levelDeep + 1, obj.id)
				}
			}
			// Add keyframes:
			if (obj.keyframes) {
				for (let i = 0; i < obj.keyframes.length; i++) {
					const keyframe = obj.keyframes[i]
					const kf2: TimelineObjectKeyframe = extendMandadory<TimelineKeyframe, TimelineObjectKeyframe>(_.clone(keyframe), {
						layer: ''
					})
					addToResolvedTimeline(kf2, levelDeep + 1, obj.id, true)
				}
			}
		}
		for (let i = 0; i < timeline.length; i++) {
			const obj: TimelineObject = timeline[i]
			addToResolvedTimeline(obj, 0)
		}
		// Step 2: go though and resolve the objects
		if (options.cache) {
			// Figure out which objects has changed since last time
			const cache: ResolverCacheInternal = initializeCache(options.cache, resolvedTimeline)

			// Go through all new objects, and determine whether they have changed:
			const allNewObjects: {[objId: string]: true} = {}
			const changedReferences: {[reference: string]: true} = {}

			const getAllReferencesThisObjectAffects = (newObj: ResolvedTimelineObject): string[] => {
				const references: string[] = ['#' + newObj.id]

				if (newObj.classes) {
					for (const className of newObj.classes) {
						references.push('.' + className)
					}
				}
				if (newObj.layer) references.push('$' + newObj.layer)
				return references
			}
			const addChangedObject = (obj: ResolvedTimelineObject) => {
				const references = getAllReferencesThisObjectAffects(obj)
				for (const ref of references) {
					changedReferences[ref] = true
				}
			}
			_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
				const oldHash = cache.objHashes[obj.id]
				const newHash = objectHash(obj)
				allNewObjects[obj.id] = true
				if (
					!oldHash ||
					oldHash !== newHash
				) {
					cache.objHashes[obj.id] = newHash
					addChangedObject(obj)

					const oldObj = cache.resolvedTimeline.objects[obj.id]
					if (oldObj) addChangedObject(oldObj)
				}
			})
			if (cache.hasOldData) {

				// Go through all old hashes, removing the ones that doesn't exist anymore
				for (const objId in cache.resolvedTimeline.objects) {
					if (!allNewObjects[objId]) {
						const obj = cache.resolvedTimeline.objects[objId]
						delete cache.objHashes[objId]
						addChangedObject(obj)
					}
				}
				// Invalidate objects, by gradually removing the invalidated ones from validObjects
				// Prepare validObjects:
				const validObjects: ResolvedTimelineObjects = {}
				_.each(resolvedTimeline.objects, obj => {
					validObjects[obj.id] = obj
				})
				/** All references that depend on another reference (ie objects, classs or layers): */
				const affectReferenceMap: {[ref: string]: string[]} = {}

				_.each(resolvedTimeline.objects, obj => {
					// Add everything that this object affects:
					let affectedReferences = getAllReferencesThisObjectAffects(obj)
					const oldObj = cache.resolvedTimeline.objects[obj.id]
					if (oldObj) {
						affectedReferences = _.uniq(affectedReferences.concat(getAllReferencesThisObjectAffects(oldObj)))
					}
					for (let i = 0; i < affectedReferences.length; i++) {
						const ref = affectedReferences[i]
						const objRef = '#' + obj.id
						if (ref !== objRef) {
							if (!affectReferenceMap[objRef]) affectReferenceMap[objRef] = []
							affectReferenceMap[objRef].push(ref)
						}
					}

					// Add everything that this object is affected by:
					if (changedReferences['#' + obj.id]) {
						// The object is directly said to be invalid, no need to add it to referencingObjects,
						// since it'll be easily invalidated anyway later
					} else {
						// Note: we only have to check for the OLD object, since if the old and the new object differs,
						// that would mean it'll be directly invalidated anyway.
						const oldObj = cache.resolvedTimeline.objects[obj.id]
						if (oldObj) {
							// Fetch all references for the object from the last time it was resolved.
							// Note: This can be done, since _if_ the object was changed in any way since last resolve
							// it'll be invalidated anyway
							const dependOnReferences = getObjectReferences(oldObj)
							for (let i = 0; i < dependOnReferences.length; i++) {
								const ref = dependOnReferences[i]
								if (!affectReferenceMap[ref]) affectReferenceMap[ref] = []
								affectReferenceMap[ref].push('#' + obj.id)
							}
						}
					}
				})
				// Invalidate all changed objects, and recursively invalidate all objects that reference those objects:
				const handledReferences: {[ref: string]: true} = {}
				const invalidateObjectsWithReference = (
					reference: string,
					affectReferenceMap: {[ref: string]: string[]},
					validObjects: ResolvedTimelineObjects
				) => {
					if (handledReferences[reference]) return // to avoid infinite loops
					handledReferences[reference] = true

					if (reference[0] === '#') { // an id
						const objId = reference.slice(1)
						if (validObjects[objId]) {

							delete validObjects[objId]
							// const obj = validObjects[objId]
							// const affectedReferences = getAllReferencesThisObjectAffects(obj)

						}
					}

					// Invalidate all objects that depend on any of the references that this reference affects:

					const affectedReferences = affectReferenceMap[reference]
					if (affectedReferences) {
						for (let i = 0; i < affectedReferences.length; i++) {
							const referencingReference = affectedReferences[i]
							invalidateObjectsWithReference(referencingReference, affectReferenceMap, validObjects)
						}
					}
				}
				_.each(Object.keys(changedReferences), reference => {
					invalidateObjectsWithReference(reference, affectReferenceMap, validObjects)
				})
				// The objects that are left in validObjects at this point are still valid.
				// We can reuse the old resolving for those:
				_.each(validObjects, (obj: ResolvedTimelineObject) => {
					if (!cache.resolvedTimeline.objects[obj.id]) throw new Error(`Something went wrong: "${obj.id}" does not exist in cache.resolvedTimeline.objects`)
					resolvedTimeline.objects[obj.id] = cache.resolvedTimeline.objects[obj.id]
				})
			}
			_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
				resolveTimelineObj(resolvedTimeline, obj)
			})

			// Save for next time:
			cache.resolvedTimeline = resolvedTimeline
			cache.hasOldData = true

			// Update statistics, since that's not accurate after having used the cache:
			resolvedTimeline.statistics.unresolvedCount = 0
			resolvedTimeline.statistics.resolvedCount = 0
			resolvedTimeline.statistics.resolvedInstanceCount = 0
			resolvedTimeline.statistics.resolvedObjectCount = 0
			resolvedTimeline.statistics.resolvedGroupCount = 0
			resolvedTimeline.statistics.resolvedKeyframeCount = 0
			_.each(resolvedTimeline.objects, obj => {
				updateStatistics(resolvedTimeline, obj)
			})

			return resolvedTimeline
		} else {
			// If there are no cache provided, just resolve all objects:
			_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
				resolveTimelineObj(resolvedTimeline, obj)
			})
			return resolvedTimeline
		}
	}
	/** Calculate the state for all points in time.  */
	static resolveAllStates (resolvedTimeline: ResolvedTimeline, cache?: ResolverCache): ResolvedStates {
		return resolveStates(resolvedTimeline, undefined, cache)
	}
	/**
	 * Calculate the state at a given point in time.
	 * Using a ResolvedTimeline calculated by Resolver.resolveTimeline() or
	 * a ResolvedStates calculated by Resolver.resolveAllStates()
	 * @param resolved ResolvedTimeline calculated by Resolver.resolveTimeline.
	 * @param time The point in time where to calculate the state
	 * @param eventLimit (Optional) Limits the number of returned upcoming events.
	 */
	static getState (resolved: ResolvedTimeline | ResolvedStates, time: Time, eventLimit?: number): TimelineState {
		return getState(resolved, time, eventLimit)
	}
}

export function resolveTimelineObj (resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject) {
	if (obj.resolved.resolved) return
	if (obj.resolved.resolving) throw new Error(`Circular dependency when trying to resolve "${obj.id}"`)

	obj.resolved.resolving = true
	resolvedTimeline.statistics.resolvingCount++

	let instances: Array<TimelineObjectInstance> = []
	let directReferences: string[] = []

	const enables: TimelineEnable[] = (
		_.isArray(obj.enable) ?
		obj.enable :
		[obj.enable]
	)

	_.each(enables, enable => {
		let newInstances: Array<TimelineObjectInstance> = []

		const repeatingExpr: Expression | null = (
			enable.repeating !== undefined ?
			interpretExpression(enable.repeating) :
			null
		)
		const lookedRepeating = lookupExpression(resolvedTimeline, obj, repeatingExpr, 'duration')
		const lookedupRepeating = lookedRepeating.instances
		directReferences = directReferences.concat(lookedRepeating.allReferences)
		if (_.isArray(lookedupRepeating)) {
			throw new Error(`lookupExpression should never return an array for .duration lookup`) // perhaps tmp? maybe revisit this at some point
		}

		let start: Expression = (
			enable.while !== undefined ?
				enable.while :
			enable.start !== undefined ?
				enable.start :
			''
		)
		if (enable.while + '' === '1') {
			start = 'true'
		} else if (enable.while + '' === '0') {
			start = 'false'
		}

		const startExpr: Expression = simplifyExpression(start)

		let parentInstances: TimelineObjectInstance[] | null = null
		let hasParent: boolean = false
		let startRefersToParent: boolean = false
		if (obj.resolved.parentId) {
			hasParent = true

			const lookup = lookupExpression(
				resolvedTimeline,
				obj,
				interpretExpression(`#${obj.resolved.parentId}`),
				'start'
			)
			parentInstances = lookup.instances as TimelineObjectInstance[] | null // a start-reference will always return an array, or null
			directReferences = directReferences.concat(lookup.allReferences)

			if (isConstant(startExpr)) {
				// Only use parent if the expression resolves to a number (ie doesn't contain any references)
				startRefersToParent = true
			}
		}
		const lookupStart = lookupExpression(resolvedTimeline, obj, startExpr, 'start')
		let lookedupStarts = lookupStart.instances
		directReferences = directReferences.concat(lookupStart.allReferences)

		if (startRefersToParent) {
			lookedupStarts = applyParentInstances(parentInstances, lookedupStarts)
		}

		if (enable.while) {
			if (_.isArray(lookedupStarts)) {
				newInstances = lookedupStarts
			} else if (lookedupStarts !== null) {
				newInstances = [{
					id: getId(),
					start: lookedupStarts.value,
					end: null,
					references: lookedupStarts.references
				}]
			}
		} else {
			const events: Array<EventForInstance> = []
			let iStart: number = 0
			let iEnd: number = 0
			if (_.isArray(lookedupStarts)) {
				_.each(lookedupStarts, (instance) => {
					events.push({
						time: instance.start,
						value: true,
						data: { instance: instance, id: obj.id + '_' + iStart++ },
						references: instance.references
					})
				})
			} else if (lookedupStarts !== null) {
				events.push({
					time: lookedupStarts.value,
					value: true,
					data: { instance: { id: getId(), start: lookedupStarts.value, end: null, references:  lookedupStarts.references }, id: obj.id + '_' + iStart++ },
					references: lookedupStarts.references
				})
			}

			if (enable.end !== undefined) {
				const endExpr: Expression = interpretExpression(enable.end)
				let endRefersToParent: boolean = false
				if (obj.resolved.parentId) {
					if (isConstant(endExpr)) {
						// Only use parent if the expression resolves to a number (ie doesn't contain any references)
						endRefersToParent = true
					}
				}

				// lookedupEnds will contain an inverted list of instances. Therefore .start means an end
				const lookupEnd = endExpr ? lookupExpression(resolvedTimeline, obj, endExpr, 'end') : null
				let lookedupEnds = lookupEnd ? lookupEnd.instances : null
				if (lookupEnd) directReferences = directReferences.concat(lookupEnd.allReferences)
				if (endRefersToParent) {
					lookedupEnds = applyParentInstances(parentInstances, lookedupEnds)
				}
				if (_.isArray(lookedupEnds)) {
					_.each(lookedupEnds, (instance) => {
						events.push({
							time: instance.start,
							value: false,
							data: { instance: instance, id: obj.id + '_' + iEnd++ },
							references: instance.references
						})
					})
				} else if (lookedupEnds !== null) {
					events.push({
						time: lookedupEnds.value,
						value: false,
						data: { instance: { id: getId(), start: lookedupEnds.value, end: null, references: lookedupEnds.references }, id: obj.id + '_' + iEnd++ },
						references: lookedupEnds.references
					})
				}

			} else if (enable.duration !== undefined) {
				const durationExpr: Expression = interpretExpression(enable.duration)
				const lookupDuration = lookupExpression(resolvedTimeline, obj, durationExpr, 'duration')
				let lookedupDuration = lookupDuration.instances
				directReferences = directReferences.concat(lookupDuration.allReferences)

				if (_.isArray(lookedupDuration) && lookedupDuration.length === 1) {
					lookedupDuration = {
						value: lookedupDuration[0].start,
						references: lookedupDuration[0].references
					} as ValueWithReference
				}
				if (_.isArray(lookedupDuration) && !lookedupDuration.length) lookedupDuration = null

				if (_.isArray(lookedupDuration)) {
					throw new Error(`lookupExpression should never return an array for .duration lookup`) // perhaps tmp? maybe revisit this at some point
				} else if (lookedupDuration !== null) {

					if (
						lookedupRepeating !== null &&
						lookedupDuration.value > lookedupRepeating.value
					) lookedupDuration.value = lookedupRepeating.value

					const tmpLookedupDuration: ValueWithReference = lookedupDuration // cast type
					_.each(events, (e) => {
						if (e.value) {
							const time = e.time + tmpLookedupDuration.value
							const references = joinReferences(e.references, tmpLookedupDuration.references)
							events.push({
								time: time,
								value: false,
								data: { id: e.data.id, instance: { id: e.data.instance.id, start: time, end: null, references: references } },
								references: references
							})
						}
					})
				}
			}
			newInstances = convertEventsToInstances(events, false)
		}
		if (hasParent) {
			// figure out what parent-instance the instances are tied to, and cap them
			const cappedInstances: TimelineObjectInstance[] = []
			for (let i = 0; i < newInstances.length; i++) {
				const instance = newInstances[i]
				if (parentInstances) {

					const referredParentInstance = _.find(parentInstances, (parentInstance) => {
						return instance.references.indexOf(parentInstance.id) !== -1
					})

					if (referredParentInstance) {
						// If the child refers to its parent, there should be one specific instance to cap into
						const cappedInstance = capInstances([instance], [referredParentInstance])[0]

						if (cappedInstance) {

							if (!cappedInstance.caps) cappedInstance.caps = []
							cappedInstance.caps.push({
								id: referredParentInstance.id,
								start: referredParentInstance.start,
								end: referredParentInstance.end
							})
							cappedInstances.push(cappedInstance)
						}
					} else {
						// If the child doesn't refer to its parent, it should be capped within all of its parent instances
						for (let i = 0; i < parentInstances.length; i++) {
							const parentInstance = parentInstances[i]

							const cappedInstance = capInstances([instance], [parentInstance])[0]

							if (cappedInstance) {
								if (parentInstance) {
									if (!cappedInstance.caps) cappedInstance.caps = []
									cappedInstance.caps.push({
										id: parentInstance.id,
										start: parentInstance.start,
										end: parentInstance.end
									})
								}
								cappedInstances.push(cappedInstance)
							}
						}
					}
				}
			}
			newInstances = cappedInstances
		}
		newInstances = applyRepeatingInstances(
			newInstances,
			lookedupRepeating,
			resolvedTimeline.options
		)
		instances = instances.concat(newInstances)
	})

	obj.resolved.resolved = true
	obj.resolved.resolving = false
	obj.resolved.instances = instances
	obj.resolved.directReferences = directReferences

	updateStatistics(resolvedTimeline, obj)

}
function updateStatistics (resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject) {
	if (obj.resolved.instances.length) {
		resolvedTimeline.statistics.resolvedInstanceCount += obj.resolved.instances.length
		resolvedTimeline.statistics.resolvedCount += 1

		if (obj.isGroup) {
			resolvedTimeline.statistics.resolvedGroupCount += 1
		}
		if (obj.resolved.isKeyframe) {
			resolvedTimeline.statistics.resolvedKeyframeCount += 1
		} else {
			resolvedTimeline.statistics.resolvedObjectCount += 1
		}
	} else {
		resolvedTimeline.statistics.unresolvedCount += 1
	}
}

type ObjectRefType = 'start' | 'end' | 'duration'
/**
 * Look up a reference on the timeline
 * Return values:
 * Array<TimelineObjectInstance>: Instances on the timeline where the reference expression is true
 * ValueWithReference: A singular value which can be combined arithmetically with Instances
 * null: Means "something is invalid", an null-value will always return null when combined with other values
 *
 * @param resolvedTimeline
 * @param obj
 * @param expr
 * @param context
 */
export function lookupExpression (
	resolvedTimeline: ResolvedTimeline,
	obj: ResolvedTimelineObject,
	expr: Expression | null,
	context: ObjectRefType
): { instances: Array<TimelineObjectInstance> | ValueWithReference | null, allReferences: string[]} {
	if (expr === null) return { instances: null, allReferences: [] }
	if (
		_.isString(expr) &&
		isNumeric(expr)
	) {
		return {
			instances: {
				value: parseFloat(expr),
				references: []
			},
			allReferences: []
		}
	} else if (_.isNumber(expr)) {
		return {
			instances: {
				value: expr,
				references: []
			},
			allReferences: []
		}
	} else if (_.isString(expr)) {
		expr = expr.trim()

		if (isConstant(expr)) {
			if (expr.match(/^true$/i)) {
				return {
					instances: {
						value: 0,
						references: []
					},
					allReferences: []
				}
			} else if (expr.match(/^false$/i)) {
				return {
					instances: [],
					allReferences: []
				}
			}
		}

		// Look up string
		let invert: boolean = false
		let ignoreFirstIfZero: boolean = false
		let referencedObjs: ResolvedTimelineObject[] = []
		let ref: ObjectRefType = context
		let rest: string = ''

		let objIdsToReference: string[] = []
		const allReferences: string[] = []

		let referenceIsOk: boolean = false
		// Match id, example: "#objectId.start"
		const m = expr.match(/^\W*#([^.]+)(.*)/)
		if (m) {
			const id = m[1]
			rest = m[2]

			referenceIsOk = true
			objIdsToReference = [id]
			allReferences.push('#' + id)
		} else {
			// Match class, example: ".className.start"
			const m = expr.match(/^\W*\.([^.]+)(.*)/)
			if (m) {
				const className = m[1]
				rest = m[2]

				referenceIsOk = true
				objIdsToReference = resolvedTimeline.classes[className] || []
				allReferences.push('.' + className)
			} else {
				// Match layer, example: "$layer"
				const m = expr.match(/^\W*\$([^.]+)(.*)/)
				if (m) {
					const layer = m[1]
					rest = m[2]

					referenceIsOk = true
					objIdsToReference = resolvedTimeline.layers[layer] || []
					allReferences.push('$' + layer)
				}
			}
		}
		for (let i = 0; i < objIdsToReference.length; i++) {
			const refObjId: string = objIdsToReference[i]
			if (refObjId !== obj.id) {
				const refObj = resolvedTimeline.objects[refObjId]
				if (refObj) {
					referencedObjs.push(refObj)
				}
			} else {
				// Looks like the object is referencing itself!
				if (obj.resolved.resolving) {
					obj.resolved.isSelfReferencing = true
				}
			}
		}
		if (!referenceIsOk) {
			return { instances: null, allReferences: [] }
		}

		if (obj.resolved.isSelfReferencing) {
			// Exclude any self-referencing objects:
			referencedObjs = _.filter(referencedObjs, refObj => {
				return !refObj.resolved.isSelfReferencing
			})
		}
		if (referencedObjs.length) {
			if (rest.match(/start/)) ref = 'start'
			if (rest.match(/end/)) ref = 'end'
			if (rest.match(/duration/)) ref = 'duration'

			if (ref === 'duration') {
				// Duration refers to the first object on the resolved timeline
				const instanceDurations: Array<ValueWithReference> = []
				for (let i = 0; i < referencedObjs.length; i++) {
					const referencedObj: ResolvedTimelineObject = referencedObjs[i]
					resolveTimelineObj(resolvedTimeline, referencedObj)
					if (referencedObj.resolved.resolved) {
						if (
							obj.resolved.isSelfReferencing &&
							referencedObj.resolved.isSelfReferencing
						) {
							// If the querying object is self-referencing, exclude any other self-referencing objects,
							// ignore the object
						} else {
							const firstInstance = _.first(referencedObj.resolved.instances)
							if (firstInstance) {
								const duration: number | null = (
									firstInstance.end !== null ?
									firstInstance.end - firstInstance.start :
									null
								)
								if (duration !== null) {
									instanceDurations.push({
										value: duration,
										references: joinReferences(referencedObj.id, firstInstance.references)
									})
								}
							}
						}
					}
				}
				let firstDuration: ValueWithReference | null = null
				_.each(instanceDurations, (d) => {
					if (firstDuration === null || d.value < firstDuration.value) firstDuration = d
				})
				return { instances: firstDuration, allReferences: allReferences }
			} else {
				let returnInstances: TimelineObjectInstance[] = []

				if (ref === 'start') {
					// nothing
				} else if (ref === 'end') {
					invert = !invert
					ignoreFirstIfZero = true
				} else throw Error(`Unknown ref: "${ref}"`)

				_.each(referencedObjs, (referencedObj: ResolvedTimelineObject) => {
					resolveTimelineObj(resolvedTimeline, referencedObj)
					if (referencedObj.resolved.resolved) {
						if (
							obj.resolved.isSelfReferencing &&
							referencedObj.resolved.isSelfReferencing
						) {
							// If the querying object is self-referencing, exclude any other self-referencing objects,
							// ignore the object
						} else {
							returnInstances = returnInstances.concat(referencedObj.resolved.instances)
						}
					}
				})
				if (returnInstances.length) {

					if (invert) {
						returnInstances = invertInstances(
							returnInstances
						)
					} else {
						returnInstances = cleanInstances(returnInstances, true, true)
					}
					if (ignoreFirstIfZero) {
						const first = _.first(returnInstances)
						if (first && first.start === 0) {
							returnInstances.splice(0, 1)
						}
					}
					return { instances: returnInstances, allReferences: allReferences }
				} else {
					return { instances: [], allReferences: allReferences }
				}
			}
		} else {
			return { instances: [], allReferences: allReferences }
		}
	} else {
		if (expr) {

			const l = lookupExpression(resolvedTimeline, obj, expr.l, context)
			const r = lookupExpression(resolvedTimeline, obj, expr.r, context)
			const lookupExpr = {
				l: l.instances,
				o: expr.o,
				r: r.instances
			}

			const allReferences = l.allReferences.concat(r.allReferences)
			if (lookupExpr.o === '!') {
				// Discard l, invert and return r:
				if (lookupExpr.r && _.isArray(lookupExpr.r)) {
					return {
						instances: invertInstances(lookupExpr.r),
						allReferences: allReferences
					}
				} else {
					// We can't invert a value
					return {
						instances: lookupExpr.r,
						allReferences: allReferences
					}
				}
			} else {

				if (
					_.isNull(lookupExpr.l) ||
					_.isNull(lookupExpr.r)
				) {
					return { instances: null, allReferences: allReferences }
				}
				if (
					lookupExpr.o === '&' ||
					lookupExpr.o === '|'
				) {
					interface SideEvent extends InstanceEvent<boolean> {
						left: boolean // true = left, false = right side
						instance: TimelineObjectInstance
					}
					let events: Array<SideEvent> = []
					const addEvents = (instances: Array<TimelineObjectInstance>, left: boolean) => {
						_.each(instances, (instance) => {
							if (instance.start === instance.end) return // event doesn't actually exist...

							events.push({
								left: left,
								time: instance.start,
								value: true,
								references: [], // not used
								data: true,
								instance: instance
							})
							if (instance.end !== null) {
								events.push({
									left: left,
									time: instance.end,
									value: false,
									references: [], // not used
									data: false,
									instance: instance
								})
							}
						})
					}
					if (_.isArray(lookupExpr.l)) addEvents(lookupExpr.l, true)
					if (_.isArray(lookupExpr.r)) addEvents(lookupExpr.r, false)

					events = sortEvents(events)

					const calcResult: (left: any, right: any) => boolean = (
						lookupExpr.o === '&' ?
							(left: any, right: any): boolean => !!(left && right) :
						lookupExpr.o === '|' ?
							(left: any, right: any): boolean => !!(left || right) :
						() => { return false }
					)
					let leftValue: boolean = (isReference(lookupExpr.l) ? !!lookupExpr.l.value : false)
					let rightValue: boolean = (isReference(lookupExpr.r) ? !!lookupExpr.r.value : false)

					let leftInstance: TimelineObjectInstance | null = null
					let rightInstance: TimelineObjectInstance | null = null

					let resultValue: boolean = calcResult(leftValue, rightValue)
					const resultReferences: Array<string> = joinReferences(
						(isReference(lookupExpr.l) ? lookupExpr.l.references : []),
						(isReference(lookupExpr.r) ? lookupExpr.r.references : [])
					)

					const instances: Array<TimelineObjectInstance> = []
					const updateInstance = (time: Time, value: boolean, references: Array<string>, caps: Array<Cap>) => {
						if (value) {
							instances.push({
								id: getId(),
								start: time,
								end: null,
								references: references,
								caps: caps
							})
						} else {
							const last = _.last(instances)
							if (last) {
								last.end = time
								// don't update reference on end
							}
						}
					}
					updateInstance(0, resultValue, resultReferences, [])
					for (let i = 0; i < events.length; i++) {
						const e = events[i]
						const next = events[i + 1]

						if (e.left) {
							leftValue = e.value
							leftInstance = e.instance
						} else {
							rightValue = e.value
							rightInstance = e.instance
						}

						if (!next || next.time !== e.time) {
							const newResultValue = calcResult(leftValue, rightValue)
							const resultReferences: Array<string> = joinReferences(
								leftInstance ? leftInstance.references : [],
								rightInstance ? rightInstance.references : []
							)
							const resultCaps: Array<Cap> = (
								(
									leftInstance ? 	leftInstance.caps 	|| [] : []
								).concat(
									rightInstance ? rightInstance.caps 	|| [] : []
								)
							)

							if (newResultValue !== resultValue) {
								updateInstance(e.time, newResultValue, resultReferences, resultCaps)
								resultValue = newResultValue
							}
						}
					}
					return { instances: instances, allReferences: allReferences }
				} else {
					const operateInner: (a: ValueWithReference, b: ValueWithReference) => ValueWithReference | null = (
						lookupExpr.o === '+' ?
						(a, b) => { return { value: a.value + b.value, references: joinReferences(a.references, b.references) } } :
						lookupExpr.o === '-' ?
						(a, b) => { return { value: a.value - b.value, references: joinReferences(a.references, b.references) } } :
						lookupExpr.o === '*' ?
						(a, b) => { return { value: a.value * b.value, references: joinReferences(a.references, b.references) } } :
						lookupExpr.o === '/' ?
						(a, b) => { return { value: a.value / b.value, references: joinReferences(a.references, b.references) } } :
						lookupExpr.o === '%' ?
						(a, b) => { return { value: a.value % b.value, references: joinReferences(a.references, b.references) } } :
						() => null
					)
					const operate = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
						if (a === null || b === null) return null
						return operateInner(a, b)
					}
					const result = operateOnArrays(lookupExpr.l, lookupExpr.r, operate)
					return { instances: result, allReferences: allReferences }
				}
			}

		}
	}
	return { instances: null, allReferences: [] }
}
