import {
	ResolvedTimeline,
	ResolveOptions,
	Expression,
	ExpressionObj,
	InnerExpression,
	Time,
	TimelineState,
	Content,
	TimelineKeyframe,
	TimelineObject,
} from './api'
export * from './api'

import { StateHandler } from './resolver/StateHandler'
import { ExpressionHandler } from './resolver/ExpressionHandler'
import { ResolverHandler } from './resolver/ResolverHandler'
import { TimelineValidator } from './resolver/TimelineValidator'

/**
 * Resolves a timeline, i.e. resolves the references between objects
 * and calculates the absolute times for all objects in the timeline.
 */
export function resolveTimeline<TContent extends Content = Content>(
	timeline: TimelineObject<TContent>[],
	options: ResolveOptions
): ResolvedTimeline<TContent> {
	const resolverInstance = new ResolverHandler<TContent>(options)
	return resolverInstance.resolveTimeline(timeline)
}

/**
 * Retrieve the state for a certain point in time.
 * The state contains all objects that are active at that point in time.
 * @param resolvedTimeline
 * @param time
 * @param eventLimit
 */
export function getResolvedState<TContent extends Content = Content>(
	resolvedTimeline: ResolvedTimeline<TContent>,
	time: Time,
	eventLimit = 0
): TimelineState<TContent> {
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

/**
 * Apply keyframe content onto its parent content.
 * The keyframe content is deeply-applied onto the parent content.
 * Note: This function mutates the parentContent.
 */
export function applyKeyframeContent(parentContent: Content, keyframeContent: Content): void {
	StateHandler.applyKeyframeContent(parentContent, keyframeContent)
}

let expressionHandler: ExpressionHandler | undefined = undefined
function getExpressionHandler(): ExpressionHandler {
	if (!expressionHandler) expressionHandler = new ExpressionHandler(true)
	return expressionHandler
}
export function interpretExpression(expression: null): null
export function interpretExpression(expression: number): number
export function interpretExpression(expression: ExpressionObj): ExpressionObj
export function interpretExpression(expression: string | Expression): Expression
export function interpretExpression(expression: Expression): Expression {
	return getExpressionHandler().interpretExpression(expression)
}
export function simplifyExpression(expr0: Expression): Expression {
	return getExpressionHandler().simplifyExpression(expr0)
}
export function wrapInnerExpressions(words: Array<any>): InnerExpression {
	return getExpressionHandler().wrapInnerExpressions(words)
}
export function validateExpression(operatorList: Array<string>, expr0: Expression, breadcrumbs?: string): true {
	return getExpressionHandler().validateExpression(operatorList, expr0, breadcrumbs)
}

/**
 * If you have called any of the manual expression-functions, such as interpretExpression(),
 * you could call this to manually clean up an internal cache, to ensure your application quits cleanly.
 */
export function onCloseCleanup(): void {
	if (expressionHandler) expressionHandler.clearCache()
}
