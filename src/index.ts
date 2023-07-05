import { Resolver } from './resolver/Resolver'
import { ResolvedTimeline } from './api/resolvedTimeline'
import { ResolveOptions } from './api/resolver'
import { TimelineKeyframe, TimelineObject } from './api/timeline'
import { TimelineValidator } from './resolver/TimelineValidator'
import { Expression, ExpressionObj, InnerExpression, Time, TimelineState } from './api'
import { StateHandler } from './resolver/StateHandler'
import { ExpressionHandler } from './resolver/ExpressionHandler'

export * from './api'

/**
 * Resolves a timeline, i.e. resolves the references between objects
 * and calculates the absolute times for all objects in the timeline.
 */
export function resolveTimeline(timeline: TimelineObject[], options: ResolveOptions): ResolvedTimeline {
	const resolverInstance = new Resolver(options)
	return resolverInstance.resolveTimeline(timeline)
}

/**
 * Retrieve the state for a certain point in time.
 * The state contains all objects that are active at that point in time.
 * @param resolvedTimeline
 * @param time
 * @param eventLimit
 */
export function getResolvedState(resolvedTimeline: ResolvedTimeline, time: Time, eventLimit = 0): TimelineState {
	const stateHandler = new StateHandler()
	return stateHandler.getState(resolvedTimeline, time, eventLimit)
}

/**
 * Validates all objects in the timeline. Throws an error if something's wrong
 * @param timeline The timeline to validate
 * @param strict Set to true to enable some optional strict rules. Set this to true to increase future compatibility.
 */
export function validateTimeline(timeline: TimelineObject[], strict?: boolean): void {
	const validator = new TimelineValidator()
	validator.validateTimeline(timeline, strict)
}
/**
 * Validates a Timeline-object. Throws an error if something's wrong
 * @param timeline The timeline to validate
 * @param strict Set to true to enable some optional strict rules. Set this to true to increase future compatibility.
 */
export function validateObject(obj: TimelineObject, strict?: boolean): void {
	const validator = new TimelineValidator()
	validator.validateObject(obj, strict)
}

/**
 * Validates a Timeline-keyframe. Throws an error if something's wrong
 * @param timeline The timeline to validate
 * @param strict Set to true to enable some optional strict rules. Set this to true to increase future compatibility.
 */
export function validateKeyframe(keyframe: TimelineKeyframe, strict?: boolean): void {
	const validator = new TimelineValidator()
	validator.validateKeyframe(keyframe, strict)
}

/**
 * Validates a string that is used in Timeline as a reference (an id, a class or layer)
 * @param str The string to validate
 * @param strict Set to true to enable some optional strict rules. Set this to true to increase future compatibility.
 */
export function validateIdString(str: string, strict?: boolean): void {
	TimelineValidator.validateIdString(str, strict)
}

let expressionHandler: ExpressionHandler | undefined = undefined
export function interpretExpression(expression: null): null
export function interpretExpression(expression: number): number
export function interpretExpression(expression: ExpressionObj): ExpressionObj
export function interpretExpression(expression: string | Expression): Expression
export function interpretExpression(expression: Expression): Expression {
	if (!expressionHandler) expressionHandler = new ExpressionHandler(true)
	return expressionHandler.interpretExpression(expression)
}
export function simplifyExpression(expr0: Expression): Expression {
	if (!expressionHandler) expressionHandler = new ExpressionHandler(true)
	return expressionHandler.simplifyExpression(expr0)
}
export function wrapInnerExpressions(words: Array<any>): InnerExpression {
	if (!expressionHandler) expressionHandler = new ExpressionHandler(true)
	return expressionHandler.wrapInnerExpressions(words)
}
export function validateExpression(operatorList: Array<string>, expr0: Expression, breadcrumbs?: string): true {
	if (!expressionHandler) expressionHandler = new ExpressionHandler(true)
	return expressionHandler.validateExpression(operatorList, expr0, breadcrumbs)
}

/**
 * If you have called any of the manual expression-functions, such as interpretExpression(),
 * you could call this to manually clean up an internal cache, to ensure your application quits cleanly.
 */
export function onCloseCleanup(): void {
	if (expressionHandler) expressionHandler.clearCache()
}
