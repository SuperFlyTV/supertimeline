import { Expression, ExpressionObj } from '../api/expression'
import { ResolvedTimelineObject, TimelineObjectInstance, Cap } from '../api/resolvedTimeline'
import { Reference, Time } from '../api/types'
import { assertNever, isArray, last } from './lib/lib'

import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { InstanceHandler } from './InstanceHandler'
import { joinCaps } from './lib/cap'
import { InstanceEvent, sortEvents } from './lib/event'
import { joinReferences, isReference } from './lib/reference'
import { isNumericExpr } from './lib/expression'

export type ObjectRefType = 'start' | 'end' | 'duration'
export interface ValueWithReference {
	value: number
	references: Reference[]
}
type LookupResult = {
	result: ReferenceResult
	allReferences: Reference[]
}
type ReferenceResult = TimelineObjectInstance[] | ValueWithReference | null

export class ReferenceHandler {
	constructor(private resolvedTimeline: ResolvedTimelineHandler, private instance: InstanceHandler) {}

	/**
	 * Look up a reference on the timeline
	 * Return values:
	 * TimelineObjectInstance[]: Instances on the timeline where the reference expression is true
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
	): LookupResult {
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
				if (refObjId === obj.id) {
					// Looks like the object is referencing itself!
					if (obj.resolved.resolving) {
						obj.resolved.isSelfReferencing = true
					}
				} else {
					const refObj = this.resolvedTimeline.getObject(refObjId)
					if (refObj) referencedObjs.push(refObj)
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
				else if (/end/.exec(rest)) ref = 'end'
				else if (/duration/.exec(rest)) ref = 'duration'

				if (ref === 'duration') {
					// Duration refers to the first object on the resolved timeline
					return this.lookupReferencedObjsDuration(obj, referencedObjs, allReferences)
				} else if (ref === 'start') {
					return this.lookupReferencedObjs(obj, referencedObjs, allReferences, false, false)
				} else if (ref === 'end') {
					return this.lookupReferencedObjs(obj, referencedObjs, allReferences, true, true)
				} else {
					/* istanbul ignore next */
					assertNever(ref)
				}
			}
			return { result: [], allReferences: allReferences }
		} else if (!expr) {
			return { result: null, allReferences: [] }
		} else {
			// expr is an expressionObj
			return this.lookupExpressionObj(obj, context, expr)
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
		array0: ReferenceResult,
		array1: ReferenceResult,
		operate: OperatorFunction
	): ReferenceResult {
		if (array0 === null || array1 === null) return null

		if (isReference(array0) && isReference(array1)) {
			return operate(array0, array1)
		}

		const result: TimelineObjectInstance[] = []

		const minLength = Math.min(
			isArray(array0) ? array0.length : Infinity,
			isArray(array1) ? array1.length : Infinity
		)
		for (let i = 0; i < minLength; i++) {
			const a: TimelineObjectInstance = isArray(array0)
				? array0[i]
				: { id: '@', start: array0.value, end: array0.value, references: array0.references }
			const b: TimelineObjectInstance = isArray(array1)
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

	/**
	 * Look up the referenced objects (in the context of a duration-reference)
	 */
	private lookupReferencedObjsDuration(
		obj: ResolvedTimelineObject,
		referencedObjs: ResolvedTimelineObject[],
		allReferences: Reference[]
	): LookupResult {
		const instanceDurations: ValueWithReference[] = []
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
					const firstInstance: TimelineObjectInstance | undefined = referencedObj.resolved.instances[0]
					if (firstInstance) {
						const duration: number | null =
							firstInstance.end !== null ? firstInstance.end - firstInstance.start : null
						if (duration !== null) {
							instanceDurations.push({
								value: duration,
								references: joinReferences([`#${referencedObj.id}`], firstInstance.references),
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
	}
	/**
	 * Look up the referenced objects
	 */
	private lookupReferencedObjs(
		obj: ResolvedTimelineObject,
		referencedObjs: ResolvedTimelineObject[],
		allReferences: Reference[],
		invert: boolean,
		ignoreFirstIfZero: boolean
	): LookupResult {
		let referencedInstances: TimelineObjectInstance[] = []

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
					referencedInstances = referencedInstances.concat(referencedObj.resolved.instances)
				}
			}
		}

		if (referencedInstances.length) {
			if (invert) {
				referencedInstances = this.instance.invertInstances(referencedInstances)
			} else {
				referencedInstances = this.instance.cleanInstances(referencedInstances, true, true)
			}
			if (ignoreFirstIfZero) {
				const first: TimelineObjectInstance | undefined = referencedInstances[0]
				if (first && first.start === 0) {
					referencedInstances.splice(0, 1)
				}
			}
			return { result: referencedInstances, allReferences: allReferences }
		} else {
			return { result: [], allReferences: allReferences }
		}
	}
	/**
	 * Look up an ExpressionObj
	 */
	private lookupExpressionObj(
		obj: ResolvedTimelineObject,
		context: ObjectRefType,
		expr: ExpressionObj
	): LookupResult {
		const l = this.lookupExpression(obj, expr.l, context)
		const r = this.lookupExpression(obj, expr.r, context)
		const lookupExpr = {
			l: l.result,
			o: expr.o,
			r: r.result,
		}

		const allReferences = l.allReferences.concat(r.allReferences)

		if (lookupExpr.o === '!') {
			// Invert, ie discard l, invert and return r:
			if (lookupExpr.r && isArray(lookupExpr.r)) {
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
		} else if (lookupExpr.l === null || lookupExpr.r === null) {
			return { result: null, allReferences: allReferences }
		} else if (lookupExpr.o === '&' || lookupExpr.o === '|') {
			const combiner = new ReferenceAndOrCombiner(this.resolvedTimeline, lookupExpr.l, lookupExpr.r, lookupExpr.o)

			const instances = combiner.calculateResult()

			return { result: instances, allReferences: allReferences }
		} else {
			const operate = Operators.get(lookupExpr.o)

			const result = this.operateOnArrays(lookupExpr.l, lookupExpr.r, operate)
			return { result: result, allReferences: allReferences }
		}
	}
}
type OperatorFunction = (a: ValueWithReference | null, b: ValueWithReference | null) => ValueWithReference | null

/** Helper class that deals with an And ('&') or an Or ('|') expression */
class ReferenceAndOrCombiner {
	private calcResult: (left: any, right: any) => boolean

	private events: SideEvent[] = []
	private instances: TimelineObjectInstance[] = []

	constructor(
		private resolvedTimeline: ResolvedTimelineHandler,
		private leftOperand: TimelineObjectInstance[] | ValueWithReference,
		private rightOperand: TimelineObjectInstance[] | ValueWithReference,
		operator: '&' | '|'
	) {
		if (operator === '&') {
			this.calcResult = (left: any, right: any): boolean => !!(left && right)
		} else if (operator === '|') {
			this.calcResult = (left: any, right: any): boolean => !!(left || right)
		} else {
			/* istanbul ignore next */
			assertNever(operator)
			/* istanbul ignore next */
			this.calcResult = () => false
		}

		if (isArray(leftOperand)) this._addInstanceEvents(leftOperand, true)
		if (isArray(rightOperand)) this._addInstanceEvents(rightOperand, false)
		this.events = sortEvents(this.events)
	}

	private _addInstanceEvents(instances: TimelineObjectInstance[], left: boolean) {
		for (let i = 0; i < instances.length; i++) {
			const instance = instances[i]
			if (instance.start !== instance.end) {
				// event doesn't actually exist...

				this.events.push({
					left: left,
					time: instance.start,
					value: true,
					references: [], // not used
					data: true,
					instance: instance,
				})
				if (instance.end !== null) {
					this.events.push({
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

	public calculateResult(): TimelineObjectInstance[] {
		let leftValue: boolean = isReference(this.leftOperand) ? !!this.leftOperand.value : false
		let rightValue: boolean = isReference(this.rightOperand) ? !!this.rightOperand.value : false

		let leftInstance: TimelineObjectInstance | null = null
		let rightInstance: TimelineObjectInstance | null = null

		let resultValue: boolean = this.calcResult(leftValue, rightValue)

		this.updateInstance(
			0,
			resultValue,
			joinReferences(
				isReference(this.leftOperand) ? this.leftOperand.references : [],
				isReference(this.rightOperand) ? this.rightOperand.references : []
			),
			[]
		)

		for (let i = 0; i < this.events.length; i++) {
			const e = this.events[i]
			const next = this.events[i + 1]

			if (e.left) {
				leftValue = e.value
				leftInstance = e.instance
			} else {
				rightValue = e.value
				rightInstance = e.instance
			}

			if (!next || next.time !== e.time) {
				const newResultValue = this.calcResult(leftValue, rightValue)
				const resultCaps: Cap[] = (leftInstance ? leftInstance.caps ?? [] : []).concat(
					rightInstance ? rightInstance.caps ?? [] : []
				)

				if (newResultValue !== resultValue) {
					this.updateInstance(
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

		return this.instances
	}

	private updateInstance(time: Time, value: boolean, references: Reference[], caps: Cap[]) {
		if (value) {
			this.instances.push({
				id: this.resolvedTimeline.getInstanceId(),
				start: time,
				end: null,
				references: references,
				caps: caps,
			})
		} else {
			const lastInstance = last(this.instances)
			if (lastInstance) {
				lastInstance.end = time
				// don't update reference on end
			}
		}
	}
}
interface SideEvent extends InstanceEvent<boolean> {
	left: boolean // true = left, false = right side
	instance: TimelineObjectInstance
}

/** Helper class for various operators */
class Operators {
	static get(operator: '+' | '-' | '*' | '/' | '%'): OperatorFunction {
		switch (operator) {
			case '+':
				return Operators.Add
			case '-':
				return Operators.Subtract
			case '*':
				return Operators.Multiply
			case '/':
				return Operators.Divide
			case '%':
				return Operators.Modulo
			default: {
				assertNever(operator)
				return Operators.Null
			}
		}
	}

	private static Add = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value + b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Subtract = (
		a: ValueWithReference | null,
		b: ValueWithReference | null
	): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value - b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Multiply = (
		a: ValueWithReference | null,
		b: ValueWithReference | null
	): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value * b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Divide = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value / b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Modulo = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value % b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Null = (): ValueWithReference | null => {
		return null
	}
}
