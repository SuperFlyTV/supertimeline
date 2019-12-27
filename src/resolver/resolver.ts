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
	ResolvedStates
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
			options: _.clone(options),
			objects: {},
			classes: {},
			layers: {},
			statistics: {
				unresolvedCount: 0,
				resolvedCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0
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
					isSelfReferencing: false
				}
			})
			if (parentId) o.resolved.parentId = parentId
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
		_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
			resolveTimelineObj(resolvedTimeline, obj)
		})

		return resolvedTimeline
	}
	/** Calculate the state for all points in time.  */
	static resolveAllStates (resolvedTimeline: ResolvedTimeline): ResolvedStates {
		return resolveStates(resolvedTimeline)
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

	let instances: Array<TimelineObjectInstance> = []

	const repeatingExpr: Expression | null = (
		obj.enable.repeating !== undefined ?
		interpretExpression(obj.enable.repeating) :
		null
	)
	const lookedupRepeating = lookupExpression(resolvedTimeline, obj, repeatingExpr, 'duration')
	if (_.isArray(lookedupRepeating)) {
		throw new Error(`lookupExpression should never return an array for .duration lookup`) // perhaps tmp? maybe revisit this at some point
	}

	let start: Expression = (
		obj.enable.while !== undefined ?
			obj.enable.while :
		obj.enable.start !== undefined ?
			obj.enable.start :
		''
	)
	if (obj.enable.while + '' === '1') {
		start = 'true'
	} else if (obj.enable.while + '' === '0') {
		start = 'false'
	}

	const startExpr: Expression = simplifyExpression(start)

	let parentInstances: TimelineObjectInstance[] | null = null
	let hasParent: boolean = false
	let referToParent: boolean = false
	if (obj.resolved.parentId) {
		hasParent = true
		parentInstances = lookupExpression(
			resolvedTimeline,
			obj,
			interpretExpression(`#${obj.resolved.parentId}`),
			'start'
		) as TimelineObjectInstance[] | null // a start-reference will always return an array, or null

		if (isConstant(startExpr)) {
			// Only use parent if the expression resolves to a number (ie doesn't contain any references)
			referToParent = true
		}
	}
	let lookedupStarts = lookupExpression(resolvedTimeline, obj, startExpr, 'start')

	if (referToParent) {
		lookedupStarts = applyParentInstances(parentInstances, lookedupStarts)
	}

	if (obj.enable.while) {
		if (_.isArray(lookedupStarts)) {
			instances = lookedupStarts
		} else if (lookedupStarts !== null) {
			instances = [{
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

		if (obj.enable.end !== undefined) {
			const endExpr: Expression = interpretExpression(obj.enable.end)
			// lookedupEnds will contain an inverted list of instances. Therefore .start means an end
			let lookedupEnds = (
				endExpr ?
				lookupExpression(resolvedTimeline, obj, endExpr, 'end') :
				null
			)
			if (referToParent && isConstant(endExpr)) {
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
		} else if (obj.enable.duration !== undefined) {
			const durationExpr: Expression = interpretExpression(obj.enable.duration)
			let lookedupDuration = lookupExpression(resolvedTimeline, obj, durationExpr, 'duration')

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

		instances = convertEventsToInstances(events, false)
	}
	if (hasParent) {
		// figure out what parent-instance the instances are tied to, and cap them
		const cappedInstances: TimelineObjectInstance[] = []
		for (let i = 0; i < instances.length; i++) {
			const instance = instances[i]
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
		instances = cappedInstances
	}
	instances = applyRepeatingInstances(
		instances,
		lookedupRepeating,
		resolvedTimeline.options
	)

	// filter out zero-length instances:
	instances = _.filter(instances, (instance) => {
		return ((instance.end || Infinity) > instance.start)
	})

	obj.resolved.resolved = true
	obj.resolved.resolving = false
	obj.resolved.instances = instances

	if (instances.length) {
		resolvedTimeline.statistics.resolvedInstanceCount += instances.length
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
): Array<TimelineObjectInstance> | ValueWithReference | null {
	if (expr === null) return null
	if (
		_.isString(expr) &&
		isNumeric(expr)
	) {
		return {
			value: parseFloat(expr),
			references: []
		}
	} else if (_.isNumber(expr)) {
		return {
			value: expr,
			references: []
		}
	} else if (_.isString(expr)) {
		expr = expr.trim()

		if (isConstant(expr)) {
			if (expr.match(/^true$/i)) {
				return {
					value: 0,
					references: []
				}
			} else if (expr.match(/^false$/i)) {
				return []
			}
		}

		// Look up string
		let invert: boolean = false
		let ignoreFirstIfZero: boolean = false
		let referencedObjs: ResolvedTimelineObject[] = []
		let ref: ObjectRefType = context
		let rest: string = ''

		let objIdsToReference: string[] = []

		let referenceIsOk: boolean = false
		// Match id, example: "#objectId.start"
		const m = expr.match(/^\W*#([^.]+)(.*)/)
		if (m) {
			const id = m[1]
			rest = m[2]

			referenceIsOk = true
			objIdsToReference = [id]
		} else {
			// Match class, example: ".className.start"
			const m = expr.match(/^\W*\.([^.]+)(.*)/)
			if (m) {
				const className = m[1]
				rest = m[2]

				referenceIsOk = true
				objIdsToReference = resolvedTimeline.classes[className] || []
			} else {
				// Match layer, example: "$layer"
				const m = expr.match(/^\W*\$([^.]+)(.*)/)
				if (m) {
					const layer = m[1]
					rest = m[2]

					referenceIsOk = true
					objIdsToReference = resolvedTimeline.layers[layer] || []
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
		if (!referenceIsOk) return null

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
				return firstDuration
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
					return returnInstances
				} else {
					return []
				}
			}
		} else {
			return []
		}
	} else {
		if (expr) {

			const lookupExpr = {
				l: lookupExpression(resolvedTimeline, obj, expr.l, context),
				o: expr.o,
				r: lookupExpression(resolvedTimeline, obj, expr.r, context)
			}
			if (lookupExpr.o === '!') {
				// Discard l, invert and return r:
				if (lookupExpr.r && _.isArray(lookupExpr.r)) {
					return invertInstances(
						lookupExpr.r
					)
				} else {
					// We can't invert a value
					return lookupExpr.r
				}
			} else {

				if (
					_.isNull(lookupExpr.l) ||
					_.isNull(lookupExpr.r)
				) {
					return null
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
					return instances
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
					return result
				}
			}

		}
	}
	return null
}
