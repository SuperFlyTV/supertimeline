import {
	TraceLevel
} from '../api/legacyEnums'
import {
	UnresolvedTimeline,
	ResolvedTimeline,
	SomeTime,
	StartTime,
	Expression,
	TimelineResolvedObject,
	TimelineState,
	DevelopedTimeline,
	ExternalFunctions
} from '../api/legacy'
import _ = require('underscore')

/**
 * This file contains a set of functions that are to ensure backwards compability
 */
let traceLevel: TraceLevel = TraceLevel.ERRORS // 0
const throwErrors: boolean = false
export class Resolver {
	static setTraceLevel (levelName: string | TraceLevel) {
		let lvl: TraceLevel = TraceLevel.ERRORS
		if (_.isNumber(levelName)) lvl = levelName
		else if (levelName === 'ERRORS') lvl = TraceLevel.ERRORS
		else if (levelName === 'INFO') lvl = TraceLevel.INFO
		else if (levelName === 'TRACE') lvl = TraceLevel.TRACE
		else lvl = TraceLevel.ERRORS

		traceLevel = lvl
	}
	static getTraceLevel (): TraceLevel {
		return traceLevel
	}
	/*
	 * getState
	 * time [optional] unix time, default: now
	 * returns the current state
	*/
	static getState (data: UnresolvedTimeline | ResolvedTimeline,time: SomeTime,externalFunctions?: ExternalFunctions) {

	}

	/*
	* time [optional] unix time, default: now
	* count: number, how many events we want to return
	* returns an array of the next events
	*/
	static getNextEvents (data: ResolvedTimeline, time: SomeTime, count?: number) {
		
	}

	/*
	* startTime: unix time
	* endTime: unix time
	* returns an array of the events that occurs inside a window
	*/
	static getTimelineInWindow (data: UnresolvedTimeline, startTime?: StartTime, endTime?: EndTime) {
		
	}

	/*
	* startTime: unix time
	* endTime: unix time
	* returns an array of the objects that are relevant inside a window
	*/
	static getObjectsInWindow (data: UnresolvedTimeline, startTime: SomeTime, endTime?: SomeTime) {
		
	}
	static interpretExpression (strOrExpr: string | number | Expression,isLogical?: boolean) {
		return interpretExpression(strOrExpr,isLogical)
	}
	static resolveExpression (
		strOrExpr: string | number | Expression,
		getObjectAttribute?: objAttributeFunction
	) {
		if (!getObjectAttribute) getObjectAttribute = nullGetObjectAttribute
		return resolveExpression(strOrExpr, [], getObjectAttribute)
	}
	static resolveLogicalExpression (
		expressionOrString: Expression | null,
		obj?: TimelineResolvedObject,
		returnExpl?: boolean,
		currentState?: TimelineState
	) {
		return resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState)
	}
	static developTimelineAroundTime (tl: ResolvedTimeline, time: SomeTime): DevelopedTimeline {
		return developTimelineAroundTime(tl, time)
	}

	static decipherLogicalValue (
		str: string | number,
		obj: TimelineObject | TimelineKeyframe,
		currentState: TimelineState,
		returnExpl?: boolean
	): boolean | string {
		return decipherLogicalValue(str,obj,currentState,returnExpl)
	}
}