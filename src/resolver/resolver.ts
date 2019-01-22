
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
	TimelineState
 } from '../api/api'
import { interpretExpression } from './expression'

export class Resolver {

	static resolveTimeline (timeline: Array<TimelineObject>, options: ResolveOptions): ResolvedTimeline {

		const resolvedTimeline: ResolvedTimeline = {
			options: _.clone(options),
			objects: {}
		}
		// Step 1: pre-populate resolvedTimeline with objects
		const addToResolvedTimeline = (obj: TimelineObject, parentId?: string) => {
			if (resolvedTimeline.objects[obj.id]) throw Error(`All timelineObjects must be unique! (duplicate: "${obj.id}")`)

			const o: ResolvedTimelineObject = _.extend({
				resolved: {
					resolved: false,
					instances: [],
					parentId: parentId
				}
			}, obj)
			resolvedTimeline.objects[obj.id] = o

			if (obj.isGroup && obj.children) {
				_.each(obj.children, (child) => {
					addToResolvedTimeline(child, obj.id)
				})
			}
		}
		_.each(timeline, (obj: TimelineObject) => {
			addToResolvedTimeline(obj)
		})
		// Step 2: go though and resolve the objects
		_.each(resolvedTimeline.objects, (obj: ResolvedTimelineObject) => {
			resolveTimelineObj(resolvedTimeline, obj)
		})
		return resolvedTimeline
	}

	static getState (resolved: ResolvedTimeline, time: Time): TimelineState {
		
	}

	static getNextEvents (resolved: ResolvedTimeline, time: Time, limit: number = 10) {
		
	}
}

function resolveTimelineObj (resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject) {
	if (obj.resolved.resolved) return
	if (obj.resolved.resolving) throw new Error(`Circular dependency when trying to resolve "${obj.id}"`)
	obj.resolved.resolving = true
	// console.log('resolveTimelineObj', obj)

	let instances: Array<TimelineObjectInstance> = []
	const start: Expression = (
		obj.trigger.while !== undefined ?
			obj.trigger.while :
		obj.trigger.start !== undefined ?
			obj.trigger.start :
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
	if (useParent) {
		lookedupStarts = applyParentInstances(lookedupStarts)
	}
	// console.log('lookedupStarts', startExpr, lookedupStarts)
	if (obj.trigger.while) {

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

		if (obj.trigger.end !== undefined) {
			const endExpr: ExpressionObj | number | null = interpretExpression(obj.trigger.end)
			// lookedupEnds will contain an inverted list of instances. Therefore .start means an end
			let lookedupEnds = (
				endExpr ?
				lookupExpression(resolvedTimeline, obj, endExpr, 'end') :
				null
			)
			if (useParent && isNumeric(endExpr)) {
				lookedupEnds = applyParentInstances(lookedupEnds)
			}
			// console.log('lookedupEnds', startExpr, lookedupEnds)

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
		} else if (obj.trigger.duration !== undefined) {
			const durationExpr: ExpressionObj | number | null = interpretExpression(obj.trigger.duration)
			const lookedupDuration = lookupExpression(resolvedTimeline, obj, durationExpr, 'duration')
			// console.log('lookedupDuration', durationExpr, lookedupDuration)
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
		// console.log('events', events)

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

	obj.resolved.resolved = true
	obj.resolved.resolving = false
	obj.resolved.instances = instances

}
type ObjectRefType = 'start' | 'end' | 'duration'
export function lookupExpression (
	resolvedTimeline: ResolvedTimeline,
	obj: TimelineObject,
	expr: Expression | null,
	context: ObjectRefType
): Array<TimelineObjectInstance> | number | null {
	// console.log('----lookupExpression', expr)
	if (expr === null) return null
	if (
		_.isString(expr) &&
		isNumeric(expr)
	) {
		return parseFloat(expr)
	} else if (_.isNumber(expr)) {
		return expr
	} else if (_.isString(expr)) {
		// console.log('string ', expr)
		// Look up string
		let invert: boolean = false
		let ignoreFirstIfZero: boolean = false
		const m = expr.match(/(!)?\W*#([^.]+)(.*)/)
		if (m) {
			const exclamation = m[1]
			const id = m[2]
			const rest = m[3]
			if (exclamation === '!') invert = !invert

			let ref: ObjectRefType = context
			if (rest.match(/start/)) ref = 'start'
			if (rest.match(/end/)) ref = 'end'
			if (rest.match(/duration/)) ref = 'duration'

			const referencedObj = resolvedTimeline.objects[id]

			// console.log('referencedObj', referencedObj)
			if (referencedObj) {
				resolveTimelineObj(resolvedTimeline, referencedObj)
				// console.log('resolved', referencedObj.resolved.resolved)
				if (referencedObj.resolved.resolved) {
					// console.log(referencedObj.resolved.instances)

					if (ref === 'duration') {
						// Duration refers to the first object on the resolved timeline
						const firstInstance = _.first(referencedObj.resolved.instances)
						return (
							firstInstance && firstInstance.end !== null ?
							firstInstance.end - firstInstance.start :
							null
						)
					} else {
						let instances: Array<TimelineObjectInstance> = referencedObj.resolved.instances
						if (ref === 'start') {
							// nothing
						} else if (ref === 'end') {
							invert = !invert
							ignoreFirstIfZero = true
						} else throw Error(`Unknown ref: "${ref}"`)

						if (invert) {
							instances = invertInstances(
								referencedObj.resolved.instances
							)
						}
						if (ignoreFirstIfZero) {
							const first = _.first(instances)
							if (first && first.start === 0) {
								instances.splice(0, 1)
							}
						}
						return instances
					}
				} else {
					return null
				}
			} else {
				return null
			}
		}
	} else {
		if (expr) {

			const lookupExpr = {
				l: lookupExpression(resolvedTimeline, obj, expr.l, context),
				o: expr.o,
				r: lookupExpression(resolvedTimeline, obj, expr.r, context)
			}
			// console.log('lookupExpr', lookupExpr)
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
				// console.log('events', events)

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
				// console.log('resultValue', resultValue)

				const instances: Array<TimelineObjectInstance> = []
				const updateInstance = (time: Time, value: boolean) => {
					// console.log('updateInstance', time, resultValue)
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

					// console.log(e.time, leftValue, rightValue)

					if (!next || next.time !== e.time) {
						const newResultValue = calcResult(leftValue, rightValue)
						// console.log('newResultValue', newResultValue)

						if (newResultValue !== resultValue) {
							updateInstance(e.time, newResultValue)
							resultValue = newResultValue
						}
					}
				}
				// console.log('instances', instances)
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
				// console.log('result', result)
				return result
			}
		}
	}
	return null
}
function isNumeric (str: string | number | null | any): boolean {
	if (str === null) return false
	if (_.isNumber(str)) return true
	if (_.isString(str)) return !!(str.match(/^[0-9\.]+$/) && !_.isNaN(parseFloat(str)))
	return false
}
function sortEvents<T extends InstanceEvent> (events: Array<T>): Array<T> {
	return events.sort((a: InstanceEvent, b: InstanceEvent) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		if (a.value && !b.value) return -1
		if (!a.value && b.value) return 1
		return 0
	})
}
function invertInstances (instances: Array<TimelineObjectInstance>): Array<TimelineObjectInstance> {

	if (instances.length) {
		const invertedInstances: Array<TimelineObjectInstance> = []
		if (instances[0].start !== 0) {
			invertedInstances.push({
				isFirst: true,
				start: 0,
				end: null
			})
		}
		_.each(instances, (instance) => {
			const last = _.last(invertedInstances)
			if (last) {
				last.end = instance.start
			}
			if (instance.end !== null) {
				invertedInstances.push({
					start: instance.end,
					end: null
				})
			}
		})
		return invertedInstances
	} else {
		return [{
			isFirst: true,
			start: 0,
			end: null
		}]
	}
}
function operateOnArrays (
	array0: Array<TimelineObjectInstance> | number | null,
	array1: Array<TimelineObjectInstance> | number | null,
	operate: (a: number | null, b: number | null) => number | null
): Array<TimelineObjectInstance> | number | null {
	if (
		array0 === null ||
		array1 === null
	) return null

	if (
		_.isNumber(array0) &&
		_.isNumber(array1)
	) {
		return operate(array0, array1)
	}

	const result: Array<TimelineObjectInstance> = []

	const minLength = Math.min(
		_.isArray(array0) ? array0.length : Infinity,
		_.isArray(array1) ? array1.length : Infinity
	)
	for (let i = 0; i < minLength; i++) {
		const a: TimelineObjectInstance = (
			_.isArray(array0) ?
			array0[i] :
			{ start: array0, end: array0 }
		)
		const b: TimelineObjectInstance = (
			_.isArray(array1) ?
			array1[i] :
			{ start: array1, end: array1 }
		)
		const start = (
			a.isFirst ?
				a.start :
			b.isFirst ?
				b.start :
			operate(a.start, b.start)
		)
		const end = (
			a.isFirst ?
				a.end :
			b.isFirst ?
				b.end :
			operate(a.end, b.end)
		)
		if (start !== null) {
			result.push({
				start: start,
				end: end
			})
		}
	}
	return result
}
// function makeNumber (num: string | number) {
// 	a.start
// }
