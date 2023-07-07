import { Expression } from '../api/expression'
import { ResolvedTimelineObject, TimelineObjectInstance, Cap } from '../api/resolvedTimeline'
import { Reference, Time } from '../api/types'
import { assertNever, last } from './lib/lib'

import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { InstanceHandler } from './InstanceHandler'
import { joinCaps } from './lib/cap'
import { InstanceEvent, sortEvents } from './lib/event'
import { joinReferences, isReference } from './lib/reference'
import { isNumericExpr } from './lib/expression'

type ObjectRefType = 'start' | 'end' | 'duration'
export interface ValueWithReference {
	value: number
	references: Array<Reference>
}

export class ReferenceHandler {
	constructor(private resolvedTimeline: ResolvedTimelineHandler, private instance: InstanceHandler) {}

	/**
	 * Look up a reference on the timeline
	 * Return values:
	 * Array<TimelineObjectInstance>: Instances on the timeline where the reference expression is true
	 * ValueWithReference: A singular value which can be combined arithmetically with Instances
	 * null: Means "something is invalid", an null-value will always return null when combined with other values
	 *
	 * @param obj
	 * @param expr
	 * @param context
	 */
	public lookupExpression(
		obj: ResolvedTimelineObject,
		expr: Expression | null,
		context: ObjectRefType
	): {
		result: TimelineObjectInstance[] | ValueWithReference | null
		allReferences: Reference[]
	} {
		if (expr === null) return { result: null, allReferences: [] }
		if (typeof expr === 'string' && isNumericExpr(expr)) {
			return {
				result: {
					value: parseFloat(expr),
					references: [],
				},
				allReferences: [],
			}
		} else if (typeof expr === 'number') {
			return {
				result: {
					value: expr,
					references: [],
				},
				allReferences: [],
			}
		} else if (typeof expr === 'string') {
			expr = expr.trim()

			const exprLower = expr.toLowerCase()
			if (exprLower === 'true') {
				return {
					result: {
						value: 0,
						references: [],
					},
					allReferences: [],
				}
			} else if (exprLower === 'false') {
				return {
					result: null,
					allReferences: [],
				}
			}

			// Look up string
			let invert = false
			let ignoreFirstIfZero = false
			let referencedObjs: ResolvedTimelineObject[] = []
			let ref: ObjectRefType = context
			let rest = ''

			let objIdsToReference: string[] = []
			const allReferences: Reference[] = []

			let referenceIsOk = false
			// Match id, example: "#objectId.start"
			const m = /^\W*#([^.]+)(.*)/.exec(expr)
			if (m) {
				const id = m[1]
				rest = m[2]

				referenceIsOk = true
				objIdsToReference = [id]
				allReferences.push(`#${id}`)
			} else {
				// Match class, example: ".className.start"
				const m = /^\W*\.([^.]+)(.*)/.exec(expr)
				if (m) {
					const className = m[1]
					rest = m[2]

					referenceIsOk = true
					objIdsToReference = this.resolvedTimeline.getClassObjects(className) ?? []
					allReferences.push(`.${className}`)
				} else {
					// Match layer, example: "$layer"
					const m = /^\W*\$([^.]+)(.*)/.exec(expr)
					if (m) {
						const layer = m[1]
						rest = m[2]

						referenceIsOk = true
						objIdsToReference = this.resolvedTimeline.getLayerObjects(layer) ?? []
						allReferences.push(`$${layer}`)
					}
				}
			}
			for (let i = 0; i < objIdsToReference.length; i++) {
				const refObjId: string = objIdsToReference[i]
				if (refObjId !== obj.id) {
					const refObj = this.resolvedTimeline.getObject(refObjId)
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
				return { result: null, allReferences: [] }
			}

			if (obj.resolved.isSelfReferencing) {
				// Exclude any self-referencing objects:
				referencedObjs = referencedObjs.filter((refObj) => {
					return !refObj.resolved.isSelfReferencing
				})
			}
			if (referencedObjs.length) {
				if (/start/.exec(rest)) ref = 'start'
				if (/end/.exec(rest)) ref = 'end'
				if (/duration/.exec(rest)) ref = 'duration'

				if (ref === 'duration') {
					// Duration refers to the first object on the resolved timeline
					const instanceDurations: Array<ValueWithReference> = []
					for (let i = 0; i < referencedObjs.length; i++) {
						const referencedObj: ResolvedTimelineObject = referencedObjs[i]

						// Ensure that the referenced object is resolved.
						// Note: This is where referenced object(s) are recursively resolved
						this.resolvedTimeline.resolveTimelineObj(referencedObj)
						if (referencedObj.resolved.resolvedReferences) {
							if (obj.resolved.isSelfReferencing && referencedObj.resolved.isSelfReferencing) {
								// If the querying object is self-referencing, exclude any other self-referencing objects,
								// ignore the object
							} else {
								const firstInstance: TimelineObjectInstance | undefined =
									referencedObj.resolved.instances[0]
								if (firstInstance) {
									const duration: number | null =
										firstInstance.end !== null ? firstInstance.end - firstInstance.start : null
									if (duration !== null) {
										instanceDurations.push({
											value: duration,
											references: joinReferences(
												[`#${referencedObj.id}`],
												firstInstance.references
											),
										})
									}
								}
							}
						}
					}
					let firstDuration: ValueWithReference | null = null
					for (let i = 0; i < instanceDurations.length; i++) {
						const d: ValueWithReference = instanceDurations[i]
						if (firstDuration === null || d.value < firstDuration.value) firstDuration = d
					}
					return { result: firstDuration, allReferences: allReferences }
				} else {
					let returnInstances: TimelineObjectInstance[] = []

					if (ref === 'start') {
						// nothing
					} else if (ref === 'end') {
						invert = !invert
						ignoreFirstIfZero = true
					} else {
						/* istanbul ignore next */
						assertNever(ref)
					}

					for (let i = 0; i < referencedObjs.length; i++) {
						const referencedObj: ResolvedTimelineObject = referencedObjs[i]

						// Ensure that the referenced object is resolved.
						// Note: This is where referenced object(s) are recursively resolved
						this.resolvedTimeline.resolveTimelineObj(referencedObj)
						if (referencedObj.resolved.resolvedReferences) {
							if (obj.resolved.isSelfReferencing && referencedObj.resolved.isSelfReferencing) {
								// If the querying object is self-referencing, exclude any other self-referencing objects,
								// ignore the object
							} else {
								returnInstances = returnInstances.concat(referencedObj.resolved.instances)
							}
						}
					}

					if (returnInstances.length) {
						if (invert) {
							returnInstances = this.instance.invertInstances(returnInstances)
						} else {
							returnInstances = this.instance.cleanInstances(returnInstances, true, true)
						}
						if (ignoreFirstIfZero) {
							const first: TimelineObjectInstance | undefined = returnInstances[0]
							if (first && first.start === 0) {
								returnInstances.splice(0, 1)
							}
						}
						return { result: returnInstances, allReferences: allReferences }
					} else {
						return { result: [], allReferences: allReferences }
					}
				}
			} else {
				return { result: [], allReferences: allReferences }
			}
		} else {
			if (expr) {
				const l = this.lookupExpression(obj, expr.l, context)
				const r = this.lookupExpression(obj, expr.r, context)
				const lookupExpr = {
					l: l.result,
					o: expr.o,
					r: r.result,
				}

				const allReferences = l.allReferences.concat(r.allReferences)
				if (lookupExpr.o === '!') {
					// Discard l, invert and return r:
					if (lookupExpr.r && Array.isArray(lookupExpr.r)) {
						return {
							result: this.instance.invertInstances(lookupExpr.r),
							allReferences: allReferences,
						}
					} else {
						// We can't invert a value
						return {
							result: lookupExpr.r,
							allReferences: allReferences,
						}
					}
				} else {
					if (lookupExpr.l === null || lookupExpr.r === null) {
						return { result: null, allReferences: allReferences }
					}
					if (lookupExpr.o === '&' || lookupExpr.o === '|') {
						interface SideEvent extends InstanceEvent<boolean> {
							left: boolean // true = left, false = right side
							instance: TimelineObjectInstance
						}
						let events: Array<SideEvent> = []
						const addEvents = (instances: Array<TimelineObjectInstance>, left: boolean) => {
							for (let i = 0; i < instances.length; i++) {
								const instance = instances[i]
								if (instance.start !== instance.end) {
									// event doesn't actually exist...

									events.push({
										left: left,
										time: instance.start,
										value: true,
										references: [], // not used
										data: true,
										instance: instance,
									})
									if (instance.end !== null) {
										events.push({
											left: left,
											time: instance.end,
											value: false,
											references: [], // not used
											data: false,
											instance: instance,
										})
									}
								}
							}
						}
						if (Array.isArray(lookupExpr.l)) addEvents(lookupExpr.l, true)
						if (Array.isArray(lookupExpr.r)) addEvents(lookupExpr.r, false)

						events = sortEvents(events)

						const calcResult: (left: any, right: any) => boolean =
							lookupExpr.o === '&'
								? (left: any, right: any): boolean => !!(left && right)
								: lookupExpr.o === '|'
								? (left: any, right: any): boolean => !!(left || right)
								: () => {
										return false
								  }
						let leftValue: boolean = isReference(lookupExpr.l) ? !!lookupExpr.l.value : false
						let rightValue: boolean = isReference(lookupExpr.r) ? !!lookupExpr.r.value : false

						let leftInstance: TimelineObjectInstance | null = null
						let rightInstance: TimelineObjectInstance | null = null

						let resultValue: boolean = calcResult(leftValue, rightValue)

						const instances: Array<TimelineObjectInstance> = []
						const updateInstance = (
							time: Time,
							value: boolean,
							references: Reference[],
							caps: Array<Cap>
						) => {
							if (value) {
								instances.push({
									id: this.resolvedTimeline.getInstanceId(),
									start: time,
									end: null,
									references: references,
									caps: caps,
								})
							} else {
								const lastInstance = last(instances)
								if (lastInstance) {
									lastInstance.end = time
									// don't update reference on end
								}
							}
						}
						updateInstance(
							0,
							resultValue,
							joinReferences(
								isReference(lookupExpr.l) ? lookupExpr.l.references : [],
								isReference(lookupExpr.r) ? lookupExpr.r.references : []
							),
							[]
						)
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
								const resultCaps: Array<Cap> = (leftInstance ? leftInstance.caps ?? [] : []).concat(
									rightInstance ? rightInstance.caps ?? [] : []
								)

								if (newResultValue !== resultValue) {
									updateInstance(
										e.time,
										newResultValue,
										joinReferences(
											leftInstance ? leftInstance.references : [],
											rightInstance ? rightInstance.references : []
										),
										resultCaps
									)
									resultValue = newResultValue
								}
							}
						}
						return { result: instances, allReferences: allReferences }
					} else {
						const operateInner: (
							a: ValueWithReference,
							b: ValueWithReference
						) => ValueWithReference | null =
							lookupExpr.o === '+'
								? (a, b) => {
										return {
											value: a.value + b.value,
											references: joinReferences(a.references, b.references),
										}
								  }
								: lookupExpr.o === '-'
								? (a, b) => {
										return {
											value: a.value - b.value,
											references: joinReferences(a.references, b.references),
										}
								  }
								: lookupExpr.o === '*'
								? (a, b) => {
										return {
											value: a.value * b.value,
											references: joinReferences(a.references, b.references),
										}
								  }
								: lookupExpr.o === '/'
								? (a, b) => {
										return {
											value: a.value / b.value,
											references: joinReferences(a.references, b.references),
										}
								  }
								: lookupExpr.o === '%'
								? (a, b) => {
										return {
											value: a.value % b.value,
											references: joinReferences(a.references, b.references),
										}
								  }
								: () => null
						const operate = (
							a: ValueWithReference | null,
							b: ValueWithReference | null
						): ValueWithReference | null => {
							if (a === null || b === null) return null
							return operateInner(a, b)
						}
						const result = this.operateOnArrays(lookupExpr.l, lookupExpr.r, operate)
						return { result: result, allReferences: allReferences }
					}
				}
			} else {
				return { result: null, allReferences: [] }
			}
		}
	}
	public applyParentInstances(
		parentInstances: TimelineObjectInstance[] | null,
		value: TimelineObjectInstance[] | null | ValueWithReference
	): TimelineObjectInstance[] | null | ValueWithReference {
		return this.operateOnArrays(parentInstances, value, this.operateApplyParentInstance)
	}
	private operateApplyParentInstance = (
		a: ValueWithReference | null,
		b: ValueWithReference | null
	): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value + b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	/**
	 * Perform an action on 2 arrays. Behaves somewhat like the ".*"-operator in Matlab
	 * @param array0
	 * @param array1
	 * @param operate
	 */
	public operateOnArrays(
		array0: Array<TimelineObjectInstance> | ValueWithReference | null,
		array1: Array<TimelineObjectInstance> | ValueWithReference | null,
		operate: (a: ValueWithReference | null, b: ValueWithReference | null) => ValueWithReference | null
	): Array<TimelineObjectInstance> | ValueWithReference | null {
		if (array0 === null || array1 === null) return null

		if (isReference(array0) && isReference(array1)) {
			return operate(array0, array1)
		}

		const result: Array<TimelineObjectInstance> = []

		const minLength = Math.min(
			Array.isArray(array0) ? array0.length : Infinity,
			Array.isArray(array1) ? array1.length : Infinity
		)
		for (let i = 0; i < minLength; i++) {
			const a: TimelineObjectInstance = Array.isArray(array0)
				? array0[i]
				: { id: '@', start: array0.value, end: array0.value, references: array0.references }
			const b: TimelineObjectInstance = Array.isArray(array1)
				? array1[i]
				: { id: '@', start: array1.value, end: array1.value, references: array1.references }

			const start: ValueWithReference | null = a.isFirst
				? { value: a.start, references: a.references }
				: b.isFirst
				? { value: b.start, references: b.references }
				: operate(
						{ value: a.start, references: joinReferences(a.references, a.id === '@' ? [] : `@${a.id}`) },
						{ value: b.start, references: joinReferences(b.references, b.id === '@' ? [] : `@${b.id}`) }
				  )
			const end: ValueWithReference | null = a.isFirst
				? a.end !== null
					? { value: a.end, references: a.references }
					: null
				: b.isFirst
				? b.end !== null
					? { value: b.end, references: b.references }
					: null
				: operate(
						a.end !== null
							? {
									value: a.end,
									references: joinReferences(a.references, a.id === '@' ? [] : `@${a.id}`),
							  }
							: null,
						b.end !== null
							? {
									value: b.end,
									references: joinReferences(b.references, b.id === '@' ? [] : `@${b.id}`),
							  }
							: null
				  )

			if (start !== null) {
				result.push({
					id: this.resolvedTimeline.getInstanceId(),
					start: start.value,
					end: end === null ? null : end.value,
					references: joinReferences(start.references, end !== null ? end.references : []),
					caps: joinCaps(a.caps, b.caps),
				})
			}
		}

		return this.instance.cleanInstances(result, false)
	}
}
