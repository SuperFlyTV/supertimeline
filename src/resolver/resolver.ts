import * as _ from 'underscore'
import {
	TimelineObject,
	ResolvedTimeline,
	ResolveOptions,
	Expression,
	ExpressionObj,
	InstanceEvent,
	ExpressionEvent,
	ResolvedTimelineObject,
	TimelineObjectInstance,
	Time,
	TimelineState,
	Duration,
	TimelineKeyframe,
	TimelineObjectKeyframe
 } from '../api/api'
import { interpretExpression } from './expression'
import { getState } from './state'
import { extendMandadory, operateOnArrays, isNumeric, applyRepeatingInstances, sortEvents, cleanInstances, invertInstances, capInstances } from '../lib'

export class Resolver {

	static resolveTimeline (timeline: Array<TimelineObject>, options: ResolveOptions): ResolvedTimeline {
		if (!_.isArray(timeline)) throw new Error('resolveTimeline: parameter timeline missing')
		if (!options) throw new Error('resolveTimeline: parameter options missing')

		const resolvedTimeline: ResolvedTimeline = {
			options: _.clone(options),
			objects: {},
			classes: {},
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
					levelDeep: levelDeep
				}
			})
			if (parentId) o.resolved.parentId = parentId
			if (isKeyframe) o.resolved.isKeyframe = true
			resolvedTimeline.objects[obj.id] = o

			if (obj.classes) {
				_.each(obj.classes, (className: string) => {
					if (className) {
						if (!resolvedTimeline.classes[className]) resolvedTimeline.classes[className] = []
						resolvedTimeline.classes[className].push(obj.id)
					}
				})
			}

			if (obj.isGroup && obj.children) {
				_.each(obj.children, (child) => {
					addToResolvedTimeline(child, levelDeep + 1, obj.id)
				})
			}
			if (obj.keyframes) {
				_.each(obj.keyframes, (keyframe) => {
					const kf2: TimelineObjectKeyframe = extendMandadory<TimelineKeyframe, TimelineObjectKeyframe>(_.clone(keyframe), {
						layer: ''
					})
					addToResolvedTimeline(kf2, levelDeep + 1, obj.id, true)
				})
			}
		}
		_.each(timeline, (obj: TimelineObject) => {
			addToResolvedTimeline(obj, 0)
		})
		// Step 2: go though and resolve the objects
		_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
			resolveTimelineObj(resolvedTimeline, obj)
		})
		return resolvedTimeline
	}

	static getState (resolved: ResolvedTimeline, time: Time, eventLimit?: number): TimelineState {
		return getState(resolved, time, eventLimit)
	}

	// static getNextEvents (resolved: ResolvedTimeline, time: Time, limit: number = 10): NextEvents {
	// }
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

	const start: Expression = (
		obj.enable.while !== undefined ?
			obj.enable.while :
		obj.enable.start !== undefined ?
			obj.enable.start :
		''
	)
	const startExpr: ExpressionObj | number | null = interpretExpression(start)

	let parentInstances: TimelineObjectInstance[] | null | number = null
	let useParent: boolean = false
	if (obj.resolved.parentId && isNumeric(startExpr)) {
		useParent = true
		parentInstances = lookupExpression(
			resolvedTimeline,
			obj,
			interpretExpression(`#${obj.resolved.parentId}`),
			'start'
		)
	}
	const applyParentInstances = (value: TimelineObjectInstance[] | null | number): TimelineObjectInstance[] | null | number => {
		const operate = (a: number | null, b: number | null): number | null => {
			if (a === null || b === null) return null
			return a + b
		}
		return operateOnArrays(parentInstances, value, operate)
	}

	let lookedupStarts = lookupExpression(resolvedTimeline, obj, startExpr, 'start')
	lookedupStarts = applyRepeatingInstances(lookedupStarts, lookedupRepeating, resolvedTimeline.options)
	if (useParent) {
		lookedupStarts = applyParentInstances(lookedupStarts)
	}
	if (obj.enable.while) {

		if (_.isArray(lookedupStarts)) {
			instances = lookedupStarts
		} else if (lookedupStarts !== null) {
			instances = [{
				start: lookedupStarts,
				end: null
			}]
		}
	} else {
		let events: Array<ExpressionEvent> = []

		if (_.isArray(lookedupStarts)) {
			_.each(lookedupStarts, (instance) => {
				events.push({
					time: instance.start,
					value: true
				})
			})
		} else if (lookedupStarts !== null) {
			events.push({
				time: lookedupStarts,
				value: true
			})
		}

		if (obj.enable.end !== undefined) {
			const endExpr: ExpressionObj | number | null = interpretExpression(obj.enable.end)
			// lookedupEnds will contain an inverted list of instances. Therefore .start means an end
			let lookedupEnds = (
				endExpr ?
				lookupExpression(resolvedTimeline, obj, endExpr, 'end') :
				null
			)
			lookedupEnds = applyRepeatingInstances(lookedupEnds, lookedupRepeating, resolvedTimeline.options)
			if (useParent && isNumeric(endExpr)) {
				lookedupEnds = applyParentInstances(lookedupEnds)
			}

			if (_.isArray(lookedupEnds)) {
				_.each(lookedupEnds, (instance) => {
					events.push({
						time: instance.start,
						value: false
					})
				})
			} else if (lookedupEnds !== null) {
				events.push({
					time: lookedupEnds,
					value: false
				})
			}
		} else if (obj.enable.duration !== undefined) {
			const durationExpr: ExpressionObj | number | null = interpretExpression(obj.enable.duration)
			const lookedupDuration = lookupExpression(resolvedTimeline, obj, durationExpr, 'duration')

			if (_.isArray(lookedupDuration)) {
				throw new Error(`lookupExpression should never return an array for .duration lookup`) // perhaps tmp? maybe revisit this at some point
			} else if (lookedupDuration !== null) {
				_.each(events, (e) => {
					if (e.value) {
						events.push({
							time: e.time + lookedupDuration,
							value: false
						})
					}
				})
			}
		}
		events = sortEvents(events)

		_.each(events, (e) => {
			const last = _.last(instances)
			if (e.value) {
				if (!last || last.end !== null) {
					instances.push({
						start: e.time,
						end: null
					})
				}
			} else {
				if (last && last.end === null) {
					last.end = e.time
				}
			}
		})
	}
	instances = capInstances(instances, parentInstances)

	obj.resolved.resolved = true
	obj.resolved.resolving = false
	obj.resolved.instances = instances

	if (instances.length) {
		resolvedTimeline.statistics.resolvedInstanceCount += instances.length

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
export function lookupExpression (
	resolvedTimeline: ResolvedTimeline,
	obj: TimelineObject,
	expr: Expression | null,
	context: ObjectRefType
): Array<TimelineObjectInstance> | number | null {
	if (expr === null) return null

	if (
		_.isString(expr) &&
		isNumeric(expr)
	) {
		return parseFloat(expr)
	} else if (_.isNumber(expr)) {
		return expr
	} else if (_.isString(expr)) {
		expr = expr.trim()
		// Look up string
		let invert: boolean = false
		let ignoreFirstIfZero: boolean = false
		const referencedObjs: ResolvedTimelineObject[] = []
		let ref: ObjectRefType = context
		let rest: string = ''

		// Match id, example: "#objectId.start"
		const m = expr.match(/^(!)?\W*#([^.]+)(.*)/)
		if (m) {
			const exclamation = m[1]
			const id = m[2]
			rest = m[3]
			if (exclamation === '!') invert = !invert

			const obj = resolvedTimeline.objects[id]
			if (obj) {
				referencedObjs.push(obj)
			}
		} else {
			// Match class, example: ".className.start"
			const m = expr.match(/^(!)?\W*\.([^.]+)(.*)/)
			if (m) {
				const exclamation = m[1]
				const className = m[2]
				rest = m[3]
				if (exclamation === '!') invert = !invert

				const objIds: string[] = resolvedTimeline.classes[className] || []

				_.each(objIds, (objId: string) => {
					const obj = resolvedTimeline.objects[objId]
					if (obj) {
						referencedObjs.push(obj)
					}
				})
			}
		}

		if (referencedObjs.length) {
			if (rest.match(/start/)) ref = 'start'
			if (rest.match(/end/)) ref = 'end'
			if (rest.match(/duration/)) ref = 'duration'

			if (ref === 'duration') {
				// Duration refers to the first object on the resolved timeline
				const instanceDurations: Array<number> = []
				_.each(referencedObjs, (referencedObj: ResolvedTimelineObject) => {
					resolveTimelineObj(resolvedTimeline, referencedObj)
					if (referencedObj.resolved.resolved) {
						const firstInstance = _.first(referencedObj.resolved.instances)
						const duration: number | null = (
							firstInstance && firstInstance.end !== null ?
							firstInstance.end - firstInstance.start :
							null
						)
						if (duration !== null) {
							instanceDurations.push(duration)
						}
					}
				})
				let firstDuration: number | null = null
				_.each(instanceDurations, (d) => {
					if (firstDuration === null || d < firstDuration) firstDuration = d
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
						const instances: Array<TimelineObjectInstance> = referencedObj.resolved.instances

						returnInstances = returnInstances.concat(instances)
					}
				})
				if (returnInstances.length) {

					if (invert) {
						returnInstances = invertInstances(
							returnInstances
						)
					} else {
						returnInstances = cleanInstances(returnInstances, false)
					}
					if (ignoreFirstIfZero) {
						const first = _.first(returnInstances)
						if (first && first.start === 0) {
							returnInstances.splice(0, 1)
						}
					}
					return returnInstances
				} else {
					return null
				}
			}
		} else {
			return null
		}
	} else {
		if (expr) {

			const lookupExpr = {
				l: lookupExpression(resolvedTimeline, obj, expr.l, context),
				o: expr.o,
				r: lookupExpression(resolvedTimeline, obj, expr.r, context)
			}
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
				let events: Array<{
					left: boolean // true = left, false = right side
					time: Time
					value: boolean
				}> = []
				const addEvents = (instances: Array<TimelineObjectInstance>, left: boolean) => {
					_.each(instances, (instance) => {
						events.push({
							left: left,
							time: instance.start,
							value: true
						})
						if (instance.end !== null) {
							events.push({
								left: left,
								time: instance.end,
								value: false
							})
						}
					})
				}
				if (_.isArray(lookupExpr.l)) addEvents(lookupExpr.l, true)
				if (_.isArray(lookupExpr.r)) addEvents(lookupExpr.r, false)

				events = sortEvents(events)

				const calcResult: (left: any, right: any) => boolean = (
					lookupExpr.o === '&' ?
						(left: any, right: any) => !!(left && right) :
					lookupExpr.o === '|' ?
						(left: any, right: any) => !!(left || right) :
					() => { return false }
				)
				let leftValue: boolean = (!_.isArray(lookupExpr.l) ? !!lookupExpr.l : false)
				let rightValue: boolean = (!_.isArray(lookupExpr.r) ? !!lookupExpr.r : false)
				let resultValue: boolean = calcResult(leftValue, rightValue)

				const instances: Array<TimelineObjectInstance> = []
				const updateInstance = (time: Time, value: boolean) => {
					if (value) {
						instances.push({
							start: time,
							end: null
						})
					} else {
						const last = _.last(instances)
						if (last) {
							last.end = time
						}
					}
				}
				updateInstance(0, resultValue)
				for (let i = 0; i < events.length; i++) {
					const e = events[i]
					const next = events[i + 1]

					if (e.left) leftValue = e.value
					else rightValue = e.value

					if (!next || next.time !== e.time) {
						const newResultValue = calcResult(leftValue, rightValue)

						if (newResultValue !== resultValue) {
							updateInstance(e.time, newResultValue)
							resultValue = newResultValue
						}
					}
				}
				return instances
			} else {
				const operateInner: (a: number, b: number) => number | null = (
					lookupExpr.o === '+' ?
					(a, b) => a + b :
					lookupExpr.o === '-' ?
					(a, b) => a - b :
					lookupExpr.o === '*' ?
					(a, b) => a * b :
					lookupExpr.o === '/' ?
					(a, b) => a / b :
					lookupExpr.o === '%' ?
					(a, b) => a % b :
					() => null
				)
				const operate = (a: number | null, b: number | null): number | null => {
					if (a === null || b === null) return null
					return operateInner(a, b)
				}
				const result = operateOnArrays(lookupExpr.l, lookupExpr.r, operate)
				return result
			}
		}
	}
	return null
}
