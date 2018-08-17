
import * as _ from 'underscore'

import { TriggerType, TraceLevel, EventType } from '../enums/enums'

let traceLevel: TraceLevel = TraceLevel.ERRORS // 0
const throwErrors: boolean = false
export interface TimelineObject {
	id: ObjectId,
	trigger: {
		type: TriggerType,
		value: number | string // unix timestamp
	},
	duration: number, // seconds
	LLayer: string | number,
	content: {
		objects?: Array<TimelineObject>,

		keyframes?: Array<TimelineKeyframe>,
		// templateData?: any,

		[key: string]: any
	},
	classes?: Array<string>
	disabled?: boolean,
	isGroup?: boolean,
	repeating?: boolean,
	priority?: number,
	externalFunction?: string
}
export interface TimelineGroup extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export type TimeMaybe = number | null

export type StartTime = number | null
export type EndTime = number | null
export type Duration = number | null
export type SomeTime = number

export type ObjectId = string

export interface TimelineEvent {
	type: EventType,
	time: SomeTime,
	obj: TimelineObject,
	kf?: TimelineResolvedKeyframe
}
export interface TimelineKeyframe {
	id: string,
	trigger: {
		type: TriggerType,
		value: number | string // unix timestamp
	},
	duration: number, // seconds
	content?: {

		// templateData?: any,
		[key: string]: any
	},
	classes?: Array<string>
}
interface UnresolvedLogicObject {
	prevOnTimeline?: string | boolean | null,
	obj: TimelineResolvedObject

}
export interface TimelineResolvedObject extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export interface TimelineResolvedKeyframe extends TimelineKeyframe {
	resolved: ResolvedDetails
	parent?: TimelineResolvedObject
}
export interface ResolvedDetails {
	startTime?: StartTime,
	endTime?: EndTime,
	innerStartTime?: StartTime,
	innerEndTime?: EndTime,
	innerDuration?: Duration
	outerDuration?: Duration,

	parentStart?: StartTime,

	parentId?: ObjectId,
	disabled?: boolean,

	referredObjectIds?: Array<ResolvedObjectId> | null,

	repeatingStartTime?: StartTime,

	templateData?: any
	developed?: boolean

	[key: string]: any
}
export interface ResolvedObjectId {
	id: string,
	hook: string
}
export interface ResolvedTimeline {
	resolved: Array<TimelineResolvedObject>,
	unresolved: Array<TimelineObject>
}
export interface DevelopedTimeline {
	resolved: Array<TimelineResolvedObject>,
	unresolved: Array<TimelineObject>
	groups: Array<TimelineGroup>,
}

export interface TimelineState {
	time: SomeTime,
	GLayers: {
		[GLayer: string]: TimelineResolvedObject
	},
	LLayers: {
		[LLayer: string]: TimelineResolvedObject
	}
}
export interface ExternalFunctions {
	[fcnName: string]: (
		obj: TimelineResolvedObject,
		state: TimelineState,
		tld: DevelopedTimeline
	) => boolean
}
export interface UnresolvedTimeline extends Array<TimelineObject> {}

export interface ResolvedObjectsStore {
	[id: string]: TimelineResolvedObject | TimelineResolvedKeyframe
}
export interface ResolvedObjectTouches {
	[key: string]: number
}

export type Expression = number | string | ExpressionObj
export interface ExpressionObj {
	l: Expression,
	o: string,
	r: Expression
}
export interface Filter {
	startTime?: StartTime,
	endTime?: EndTime,
}
type WhosAskingTrace = Array<string>
type objAttributeFunction = (objId: string, hook: 'start' | 'end' | 'duration' | 'parentStart', whosAsking: WhosAskingTrace) => number | null
const nullGetObjectAttribute: objAttributeFunction = (_objId, _hook, _whosAsking) => {
	return null
}
class Resolver {
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

		const tl = resolveTimeline(data, {})

		const tld = developTimelineAroundTime(tl,time)
		log('tld', TraceLevel.TRACE)
		log(tld, TraceLevel.TRACE)

		let state = resolveState(tld,time)
		evaluateKeyFrames(state,tld)
		if (evaluateFunctions(state,tld,externalFunctions)) {
			// do it all again:
			state = resolveState(tld,time)

			evaluateKeyFrames(state,tld)
		}

		return state

	}

	/*
	* time [optional] unix time, default: now
	* count: number, how many events we want to return
	* returns an array of the next events
	*/
	static getNextEvents (data: ResolvedTimeline, time: SomeTime, count?: number) {
		if (!count) count = 10

		let tl: ResolvedTimeline = {
			resolved: [],
			unresolved: []
		}

		if (_.isArray(data)) {
			tl = resolveTimeline(data)
		} else if (_.isObject(data) && data.resolved) {
			tl = data
		}

		const tld = developTimelineAroundTime(tl,time)

		// Create a 'pseudo LLayers' here, it's composed of objects that are and some that might be...
		const LLayers: {[GLayer: string]: TimelineResolvedObject} = {}

		_.each(tld.resolved,function (obj: TimelineResolvedObject) {
			LLayers[obj.id] = obj
		})
		_.each(tld.unresolved,function (obj: TimelineObject) {
			if (obj.trigger.type === TriggerType.LOGICAL) {
				// we'll just assume that the object might be there when the time comes...
				const obj2 = obj as TimelineResolvedObject
				LLayers[obj.id] = obj2
			}
		})

		const keyframes = evaluateKeyFrames({
			LLayers: LLayers,
			GLayers: {},
			time: 0
		},tld)

		log('getNextEvents',TraceLevel.TRACE)

		const nextEvents: Array<TimelineEvent> = []
		const usedObjIds: {[id: string]: TimelineObject} = {}

		_.each(tld.resolved, (obj: TimelineResolvedObject) => {

			if (
				(obj.resolved.endTime || 0) >= time || // the object has not already finished
				obj.resolved.endTime === 0 // the object has no endTime
			 ) {
				if (
					obj.resolved.startTime &&
					(obj.resolved.startTime || 0) >= time) { // the object has not started yet
					nextEvents.push({
						type: EventType.START,
						time: obj.resolved.startTime,
						obj: obj
					})
				}
				if (obj.resolved.endTime) {

					nextEvents.push({
						type: EventType.END,
						time: obj.resolved.endTime,
						obj: obj
					})

				}
				usedObjIds[obj.id] = obj
			}
		})
		_.each(tl.unresolved,function (obj) {
			if (obj.trigger.type === TriggerType.LOGICAL) {
				usedObjIds[obj.id] = obj
			}
		})

		_.each(keyframes, (keyFrame: TimelineResolvedKeyframe) => {

			if (keyFrame &&
				keyFrame.parent &&
				keyFrame.resolved &&
				keyFrame.resolved.startTime
			) {

				if (keyFrame.resolved.startTime >= time) { // the object has not already started

					const obj = usedObjIds[keyFrame.parent.id]
					if (obj) {

						nextEvents.push({
							type: EventType.KEYFRAME,
							time: keyFrame.resolved.startTime,
							obj: obj,
							kf: keyFrame
						})
					}
				}
				if (
					(keyFrame.resolved.endTime || 0) >= time
				) {

					const obj = usedObjIds[keyFrame.parent.id]
					if (obj) {

						nextEvents.push({
							type: EventType.KEYFRAME,
							time: (keyFrame.resolved.endTime || 0),
							obj: obj,
							kf: keyFrame
						})
					}
				}
			}
		})

		nextEvents.sort((a,b) => {
			if (a.time > b.time) return 1
			if (a.time < b.time) return -1

			if (a.type > b.type) return -1
			if (a.type < b.type) return 1

			return 0
		})

		if (count > 0 && nextEvents.length > count) nextEvents.splice(count) // delete the rest

		return nextEvents
	}

	/*
	* startTime: unix time
	* endTime: unix time
	* returns an array of the events that occurs inside a window
	*/
	static getTimelineInWindow (data: UnresolvedTimeline, startTime?: StartTime, endTime?: EndTime) {
		const tl = resolveTimeline(data,{
			startTime: startTime,
			endTime: endTime
		})
		log('tl',TraceLevel.TRACE)
		log(tl,TraceLevel.TRACE)

		return tl
	}

	/*
	* startTime: unix time
	* endTime: unix time
	* returns an array of the objects that are relevant inside a window
	*/
	static getObjectsInWindow (data: UnresolvedTimeline, startTime: SomeTime, endTime?: SomeTime) {
		const tl = resolveTimeline(data,{
			startTime: startTime,
			endTime: endTime
		})
		const tld = developTimelineAroundTime(tl,startTime)
		return tld
	}

	// Other exposed functionality:
	/*
	* strOrExpr: a string, '1+5*3' or an expression object
	* returns a validated expression
	* {
	*    l: 1
	*    o: '+''
	*    r: {
	*          l: 5
	*          o: '*'
	*          r: 3
	*       }
	* }
	*
	*
	*/
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

/*
	Resolves the objects in the timeline, ie placing the objects at their absoulte positions

	filter: {
		startTime: Number,
		endTime: Number
	}

*/
function resolveTimeline (data: UnresolvedTimeline | ResolvedTimeline, filter?: Filter): ResolvedTimeline {
	if (!filter) filter = {}
	if (!data) throw Error('resolveFullTimeline: parameter data missing!')

	// check: if data is infact a resolved timeline, then just return it:
	let unresolvedData: UnresolvedTimeline
	// @ts-ignore check if resolved / unresolved exists on object
	if (_.isObject(data) && data.resolved && data.unresolved) {
		return data as ResolvedTimeline
	} else {
		unresolvedData = data as UnresolvedTimeline
	}

	log('resolveTimeline',TraceLevel.TRACE)

	// Start resolving the triggers, i.e. resolve them into absolute times on the timeline:

	const resolvedObjects: {
		[id: string]: TimelineResolvedObject
	} = {}
	let unresolvedObjects: Array<TimelineObject> = []
	const objectIds: {
		[id: string]: boolean
	} = {}

	const checkArrayOfObjects = (arrayOfObjects: Array<TimelineObject>) => {
		_.each(arrayOfObjects,function (obj: TimelineObject) {
			if (obj) {
				if (!obj.id) 					throw Error('resolveTimeline: an object is missing its id!')
				if (!obj.trigger) 				throw Error('resolveTimeline: object "' + obj.id + '" missing "trigger" attribute!')
				if (!_.has(obj.trigger,'type')) throw Error('resolveTimeline: object "' + obj.id + '" missing "trigger.type" attribute!')
				if (objectIds[obj.id]) 			throw Error('resolveTimeline: id "' + obj.id + '" is not unique!')
				if (!_.has(obj,'LLayer')) 		throw Error('resolveTimeline: object "' + obj.id + '" missing "LLayers" attribute!')

				objectIds[obj.id] = true
				if (obj.isGroup && obj.content && obj.content.objects) {
					checkArrayOfObjects(obj.content.objects)
				}
			}
		})
	}

	checkArrayOfObjects(unresolvedData)

	unresolvedData = _.map(unresolvedData, function (objOrg) {
		const obj = _.clone(objOrg)
		if (obj) {
			obj.content = _.clone(obj.content || {})

			if (!_.has(obj.content,'GLayer')) {
				obj.content.GLayer = obj.LLayer
			}
			unresolvedObjects.push(obj)
			objectIds[obj.id] = true
		}
		return obj
	})

	const getClone = (obj: TimelineObject) => {
		const c = _.clone(obj)

		if (c.content) {
			c.content = _.clone(c.content)
			if (c.content.objects) {
				c.content.objects = _.map(c.content.objects, getClone)
			}
			if (c.content.keyframes) {
				c.content.keyframes = _.map(c.content.keyframes, getClone)
			}
		}
		return c
	}
	log('======= resolveTimeline: Starting resolving... ==============',TraceLevel.TRACE)
	const result = iterateResolveObjects(
		_.map(unresolvedObjects, (o: TimelineObject) => {
			return getClone(o)
		})
	)
	unresolvedObjects = result.unresolvedObjects
	_.each(result.resolvedObjects, (o) => {
		resolvedObjects[o.id] = o
	})

	// Now we should have resolved all resolvable objects into absolute times.
	// Any object that couldn't be resolved are left in unresolvedObjects

	// Next: Filter away objects not relevant to filter:
	let filteredObjects: Array<TimelineResolvedObject> = _.filter(resolvedObjects, (obj) => {

		if (!obj.parent) {

			let ok = true

			if (
				filter &&
				filter.startTime &&
				obj.resolved.endTime !== 0 &&
				(obj.resolved.endTime || 0) < filter.startTime
			) ok = false // The object has ended before filter.startTime

			if (
				filter &&
				filter.endTime &&
				(obj.resolved.startTime || 0) > filter.endTime
			) ok = false // The object starts after filter.endTime

			return ok
		}
		return false
	})

	filteredObjects = sortObjects(filteredObjects)

	return {
		resolved: filteredObjects,
		unresolved: unresolvedObjects
	}

}
/**
 * Develops the provided timeline around specified time
 * Developing a timeline means for example to move looping object to that
 * specific time.
 * @param  {ResolvedTimeline}  tl
 * @param  {SomeTime}          time
 * @return {DevelopedTimeline}
 */
function developTimelineAroundTime (tl: ResolvedTimeline,time: SomeTime): DevelopedTimeline {
	// extract group & inner content around a given time

	log('developTimelineAroundTime ' + time,TraceLevel.TRACE)

	const tl2: DevelopedTimeline = {
		resolved: [],
		groups: [],
		unresolved: tl.unresolved
	}
	const allObjects: {[id: string]: TimelineResolvedObject} = {}
	_.each(tl.resolved, (o) => {
		allObjects[o.id] = o
	})
	const getObjectAttribute = createGetObjectAttribute(allObjects)

	_.each(tl.resolved,function (resolvedObj) {
		// let newObj = clone(resolvedObj)
		developObj(tl2, time, resolvedObj, getObjectAttribute)
	})

	tl2.resolved = sortObjects(tl2.resolved)

	return tl2
}
function getParentStartTime (
	obj: TimelineResolvedObject,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): StartTime {
	let time: StartTime = null
	if (
		_.has(obj.resolved,'repeatingStartTime') &&
		obj.resolved.repeatingStartTime
	) {
		time = obj.resolved.repeatingStartTime

	} else if (obj.resolved.startTime) {
		time = obj.resolved.startTime
	} else {
		time = getObjectAttribute(obj.id, 'start', whosAsking)
	}
	if (time === null) return time

	if (obj.parent && !obj.resolved.developed) {
		const parentTime = getParentStartTime(
			obj.parent,
			unshiftAndReturn(whosAsking, obj.id),
			getObjectAttribute
		)
		if (parentTime === null) return null
		time += parentTime - (obj.parent.resolved.startTime || 0)
	}
	log('getParentStartTime ' + obj.id + ' ' + time, TraceLevel.TRACE)
	return time
}
function developObj (
	tl2: DevelopedTimeline,
	time: SomeTime,
	objOrg: TimelineResolvedObject,
	getObjectAttribute: objAttributeFunction,
	givenParentObj?: TimelineResolvedObject
) {
	// Develop and place on tl2:
	log('developObj ' + objOrg.id + ' ' + time,TraceLevel.TRACE)

	const returnObj = _.clone(objOrg)
	returnObj.resolved = _.clone(returnObj.resolved) || {}

	returnObj.resolved.innerStartTime = returnObj.resolved.startTime
	returnObj.resolved.innerEndTime = returnObj.resolved.endTime

	const parentObj = givenParentObj || returnObj.parent

	let parentIsRepeating = false
	if (parentObj) {
		returnObj.resolved.parentId = parentObj.id

		parentIsRepeating = (
			_.has(parentObj.resolved,'repeatingStartTime') &&
			parentObj.resolved.repeatingStartTime !== null
		)
		if (!returnObj.resolved.developed) {
			let parentTime: StartTime = 0
			parentTime = getParentStartTime(parentObj, [returnObj.id], getObjectAttribute)
			returnObj.resolved.startTime = (returnObj.resolved.startTime || 0) + (parentTime || 0)
			if (returnObj.resolved.endTime) {
				returnObj.resolved.endTime += (parentTime || 0)
			}
			returnObj.resolved.developed = true
		} else if (
			parentObj.resolved.repeatingStartTime &&
			parentObj.resolved.startTime &&
			returnObj.resolved.startTime &&
			returnObj.resolved.endTime
		) {
			// parent is repeating, move our startTime forward then
			const moveForward = parentObj.resolved.repeatingStartTime - parentObj.resolved.startTime
			if (moveForward > 0) {
				returnObj.resolved.startTime += moveForward
				returnObj.resolved.endTime += moveForward
			}
		}
	}
	if (
		parentObj &&
		parentIsRepeating &&
		parentObj.resolved.innerDuration &&
		returnObj.resolved.endTime &&
		returnObj.resolved.startTime &&
		returnObj.resolved.endTime < time
	) {
		// The object's playtime has already passed, move forward then:

		returnObj.resolved.startTime += parentObj.resolved.innerDuration
		returnObj.resolved.endTime += parentObj.resolved.innerDuration
	}

	// cap inside parent:
	if (parentObj &&
		parentObj.resolved &&
		parentObj.resolved.endTime &&
		returnObj.resolved &&
		(
			(returnObj.resolved.endTime || 0) > parentObj.resolved.endTime ||
			!returnObj.resolved.endTime // infinite
		)
	) {
		returnObj.resolved.endTime = parentObj.resolved.endTime
	}

	if (
		parentObj &&
		parentObj.resolved.endTime &&
		parentObj.resolved.startTime &&
		returnObj.resolved.startTime &&
		returnObj.resolved.endTime &&
		(
			returnObj.resolved.startTime > parentObj.resolved.endTime ||
			returnObj.resolved.endTime < parentObj.resolved.startTime
		)
	) {
		// we're outside parent, invalidate
		returnObj.resolved.startTime = null
		returnObj.resolved.endTime = null
	}

	log(returnObj,TraceLevel.TRACE)

	if (returnObj.repeating) {
		log('Repeating',TraceLevel.TRACE)

		if (!returnObj.resolved.innerDuration) throw Error('Object "#' + returnObj.id + '" is repeating but missing innerDuration!')

		log('time: ' + time,TraceLevel.TRACE)
		log('innerDuration: ' + returnObj.resolved.innerDuration,TraceLevel.TRACE)

		const repeatingStartTime = Math.max(
			(returnObj.resolved.startTime || 0),
			time - ((time - (returnObj.resolved.startTime || 0)) % returnObj.resolved.innerDuration)
		) // This is the startTime closest to, and before, time

		log('repeatingStartTime: ' + repeatingStartTime, TraceLevel.TRACE)

		returnObj.resolved.repeatingStartTime = repeatingStartTime

	}

	if (returnObj.isGroup) {
		if (returnObj.content.objects) {
			_.each(returnObj.content.objects,function (child: TimelineResolvedObject) {
				const newChild = _.clone(child)

				if (!newChild.parent) newChild.parent = returnObj
				developObj(tl2, time, newChild, getObjectAttribute, returnObj)
			})
		} else {
			throw Error('.isGroup is set, but .content.objects is missing!')
		}

		tl2.groups.push(returnObj)
	} else {
		tl2.resolved.push(returnObj)
	}
}
function resolveObjectStartTime (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): StartTime {
	// recursively resolve object trigger startTime

	if (!obj.resolved) obj.resolved = {}

	// @ts-ignore
	if (obj.disabled) obj.resolved.disabled = true

	if (obj.trigger.type === TriggerType.TIME_ABSOLUTE) {

		let startTime: number
		if (_.isNumber(obj.trigger.value)) {
			startTime = obj.trigger.value
		} else {
			startTime = parseFloat(obj.trigger.value + '')
		}
		if (obj.parent) {
			const parentTime = getParentStartTime(
				obj.parent,
				unshiftAndReturn(whosAsking, obj.id),
				getObjectAttribute
			)
			if (parentTime !== null) {
				startTime = startTime + parentTime
			}
		}

		// Easy, return the absolute time then:
		obj.resolved.startTime = startTime
		obj.resolved.developed = true

	} else if (obj.trigger.type === TriggerType.TIME_RELATIVE) {
		// ooh, it's a relative time! Relative to what, one might ask? Let's find out:

		if (!_.has(obj.resolved,'startTime') || obj.resolved.startTime === null) {
			const value = decipherTimeRelativeValue(obj.trigger.value + '', unshiftAndReturn(whosAsking, obj.id), getObjectAttribute)
			obj.resolved.startTime = value
			obj.resolved.developed = true
		}
	} else if (obj.trigger.type === TriggerType.LOGICAL) {
		// not resolved here...
		obj.resolved.startTime = null
	} else {
		throw Error('Unknown trigger type: ' + obj.trigger.type + ' in object ' + obj.id + ', asked by ' + printWhosAsking(whosAsking))
	}

	let startTime: StartTime = null
	if (typeof obj.resolved.startTime !== 'undefined') {
		startTime = obj.resolved.startTime
	}

	return startTime

}
function resolveObjectDuration (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): Duration {
	// recursively resolve object duration

	if (!obj.resolved) obj.resolved = {}

	let outerDuration: Duration = null
	let innerDuration: Duration = null

	if (obj.trigger.type === TriggerType.LOGICAL) {
		obj.resolved.outerDuration = outerDuration = null
		obj.resolved.innerDuration = innerDuration = null
	} else {

		const resolveDuration = (obj: TimelineResolvedObject | TimelineResolvedKeyframe): Duration => {
			if (_.isString(obj.duration)) {
				return decipherTimeRelativeValue(obj.duration + '', unshiftAndReturn(whosAsking, obj.id), getObjectAttribute)
			}
			return obj.duration || 0
		}

		// @ts-ignore check if object is a group
		if (obj.isGroup) {
			const startTime = getObjectAttribute(obj.id, 'start', whosAsking)

			log('RESOLVE GROUP DURATION ' + obj.id,TraceLevel.TRACE)
			let lastEndTime: EndTime = -1
			if (startTime) {
				if (obj.content && obj.content.objects) {
					_.each(obj.content.objects, (child: TimelineResolvedObject) => {
						const endTime = getObjectAttribute(child.id, 'end', unshiftAndReturn(whosAsking, obj.id)) || 0
						if (endTime > (lastEndTime || 0)) {
							lastEndTime = endTime
						}
					})
				}
			} else {
				throw Error('Cannot resolve group duration, has no own startTime, id: ' + obj.id)
			}
			innerDuration = (
				lastEndTime ?
				(lastEndTime || 0) - (startTime || 0) :
				0
			)
			obj.resolved.innerDuration = innerDuration
			const duration = resolveDuration(obj)
			if (duration !== null) {
				outerDuration = (
					(duration || 0) > 0 || duration === 0 ?
					duration :
					(lastEndTime || 0)
				)
				obj.resolved.outerDuration = outerDuration
			}
			log('GROUP DURATION: ' + obj.resolved.innerDuration + ', ' + obj.resolved.outerDuration,TraceLevel.TRACE)
		} else {

			const contentDuration = (obj.content || {}).duration // todo: deprecate this?
			const duration = resolveDuration(obj)
			outerDuration = (
				(duration || 0) > 0 || duration === 0 ?
				duration :
				contentDuration
			)
			obj.resolved.outerDuration = outerDuration

			innerDuration = (
				contentDuration > 0 || contentDuration === 0 ?
				contentDuration :
				duration
			)
			obj.resolved.innerDuration = innerDuration
		}
		log('Duration ' + outerDuration + ', ' + innerDuration, TraceLevel.TRACE)
		getObjectAttribute(obj.id, 'end', whosAsking)
	}
	return outerDuration

}

function resolveObjectEndTime (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): EndTime {
	if (!obj.resolved) obj.resolved = {}

	const startTime = getObjectAttribute(obj.id, 'start', whosAsking)
	const outerDuration = getObjectAttribute(obj.id, 'duration', whosAsking)
	let endTime: EndTime = null
	if (
		startTime !== null &&
		outerDuration !== null
	) {
		if (outerDuration) {
			endTime = (startTime || 0) + outerDuration
		} else {
			endTime = 0 // infinite
		}
		obj.resolved.endTime = endTime
	}
	return endTime
}

function interpretExpression (strOrExpr: string | number | Expression, isLogical?: boolean): Expression | null {

	// note: the order is the priority!
	let operatorList = ['+','-','*','/']
	if (isLogical) {
		operatorList = ['&','|']
	}

	const wordIsOperator = function (word: string) {
		if (operatorList.indexOf(word) !== -1) return true
		return false
	}
	let regexpOperators = ''
	_.each(operatorList,function (o) {
		regexpOperators += '\\' + o
	})

	let expression: Expression | null = null

	if (strOrExpr) {

		if (_.isString(strOrExpr) || _.isNumber(strOrExpr)) {

			let str: string = strOrExpr + ''
			// Prepare the string:
			// Make sure all operators (+-/*) have spaces between them

			str = str.replace(new RegExp('([' + regexpOperators + '\\(\\)])','g'),' $1 ') // Make sure there's a space between every operator & operand

			const words: Array<string> = _.compact(str.split(' '))

			if (words.length === 0) return null // empty expression

			// Fix special case: a + - b
			for (let i = words.length - 2; i >= 1; i--) {
				if ((words[i] === '-' || words[i] === '+') && wordIsOperator(words[i - 1])) {
					words[i] = words[i] + words[i + 1]
					words.splice(i + 1,1)
				}
			}
			interface InnerExpression {
				inner: Array<any>
				rest: Array<string>
			}
			// wrap content within parentheses:
			const wrapInnerExpressions = function (words: Array<any>): InnerExpression {
				for (let i = 0; i < words.length; i++) {

					if (words[i] === '(') {
						const tmp = wrapInnerExpressions(words.slice(i + 1))

						// insert inner expression and remove tha
						words[i] = tmp.inner
						words.splice(i + 1,tmp.inner.length + 1)
					} else if (words[i] === ')') {
						return {
							inner: words.slice(0,i),
							rest: words.slice(i + 1)
						}
					}
				}
				return {
					inner: words,
					rest: []
				}
			}

			const tmp = wrapInnerExpressions(words)

			if (tmp.rest.length) throw Error('interpretExpression: syntax error: parentheses don\'t add up in "' + str + '".')

			const expressionArray = tmp.inner

			if (expressionArray.length % 2 !== 1) throw Error('interpretExpression: operands & operators don\'t add up: "' + expressionArray.join(' ') + '".')

			const getExpression = function (words: Array<any>) {

				if (!words || !words.length) throw Error('interpretExpression: syntax error: unbalanced expression')

				if (words.length === 1 && _.isArray(words[0])) words = words[0]

				if (words.length === 1) return words[0]

				// priority order: /, *, -, +

				let operatorI = -1

				// Find the operator with the highest priority:
				_.each(operatorList,function (operator) {
					if (operatorI === -1) {
						operatorI = words.indexOf(operator)
					}
				})

				if (operatorI !== -1) {
					const o = {
						l: words.slice(0,operatorI),
						o: words[operatorI],
						r: words.slice(operatorI + 1)
					}
					o.l = getExpression(o.l)
					o.r = getExpression(o.r)

					return o
				} else throw Error('interpretExpression: syntax error: operator not found: "' + (words.join(' ')) + '"')
			}

			expression = getExpression(expressionArray)
		} else if (_.isObject(strOrExpr)) {
			expression = strOrExpr
		}
	}

	// is valid expression?

	const validateExpression = function (expr0: Expression, breadcrumbs?: string) {
		if (!breadcrumbs) breadcrumbs = 'ROOT'

		if (_.isObject(expr0)) {

			const expr: ExpressionObj = expr0 as ExpressionObj

			if (!_.has(expr,'l')) throw Error('validateExpression: "+breadcrumbs+".l missing')
			if (!_.has(expr,'o')) throw Error('validateExpression: "+breadcrumbs+".o missing')
			if (!_.has(expr,'r')) throw Error('validateExpression: "+breadcrumbs+".r missing')

			if (!_.isString(expr.o)) throw Error('validateExpression: "+breadcrumbs+".o not a string')

			if (!wordIsOperator(expr.o)) throw Error(breadcrumbs + '.o not valid: "' + expr.o + '"')

			validateExpression(expr.l,breadcrumbs + '.l')
			validateExpression(expr.r,breadcrumbs + '.r')
		}
	}

	try {
		if (expression) {
			validateExpression(expression)
		}
	} catch (e) {
		const errStr = JSON.stringify(expression)
		throw Error(errStr + ' ' + e)
	}

	log('expression: ',TraceLevel.TRACE)
	log(expression,TraceLevel.TRACE)
	/*
		Example:
		expression = {
			l: '#asdf.end'  // left operand
			o: 	'+'			// operator
			r: '2'			// right operand
		}
		expression = {
			l: '#asdf.end'
		}
		expression = {
			l: '#asdf.end'
			o: 	'+'
			r: {
				l: 1
				o: *
				r: 2
			}
		}
	*/
	return expression
}
function resolveExpression (
	expression0: Expression,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): number | null {

	if (_.isObject(expression0)) {

		const expression: ExpressionObj = expression0 as ExpressionObj

		log('resolveExpression',TraceLevel.TRACE)

		const l = resolveExpression(expression.l, whosAsking, getObjectAttribute)
		const r = resolveExpression(expression.r, whosAsking, getObjectAttribute)

		log('l: ' + l,TraceLevel.TRACE)
		log('o: ' + expression.o,TraceLevel.TRACE)
		log('r: ' + r,TraceLevel.TRACE)

		if (l === null) return null
		if (r === null) return null

		if (expression.o === '+') return l + r
		if (expression.o === '-') return l - r
		if (expression.o === '*') return l * r
		if (expression.o === '/') return l / r
	} else {

		if (isNumeric(expression0)) {
			if (_.isNumber(expression0)) {
				return expression0
			} else {

				return parseFloat(expression0 + '')
			}
		} else {
			const expression: string = expression0 + ''

			if (expression[0] === '#') { // Referring to an other object: '#id-of-object'

				const words = expression.slice(1).split('.')
				let hook = 'end'
				if (words.length === 2) {
					hook = words[1]
				}
				let objId: string | null = null
				if (words[0] === '') { // for example: "#.end" references "#self.end"
					objId = whosAsking[0]
				} else {
					objId = words[0]
				}

				const getReferredStartTime = (
					objId: string,
					whosAsking: WhosAskingTrace
				): StartTime => {

					let startTime = getObjectAttribute(objId, 'start', whosAsking)
					if (startTime !== null) {

						const parentTime = getObjectAttribute(objId, 'parentStart', whosAsking)
						if (parentTime !== null) {
							startTime = startTime + parentTime
						}
					}

					return startTime
				}
				const getReferredDuration = (
					objId: string,
					whosAsking: WhosAskingTrace
				): Duration => {
					return getObjectAttribute(objId, 'duration', whosAsking)
				}

				let val: StartTime = null
				if (hook === 'start') {
					val = getReferredStartTime(objId, whosAsking || [])
				} else if (hook === 'end') {
					const startTime = getReferredStartTime(objId, whosAsking || [])
					const duration = getReferredDuration(objId, whosAsking || [])
					if ((startTime || startTime === 0) && duration) {
						val = startTime + duration
					}
				} else if (hook === 'duration') {
					val = getReferredDuration(objId, whosAsking || [])
				} else {
					throw Error('Unknown hook: "' + expression + '"')
				}
				log('val ' + val, TraceLevel.TRACE)
				return val
			}
		}

	}
	return null
}
function resolveLogicalExpression (
	expressionOrString: Expression | null,
	obj?: TimelineObject | TimelineKeyframe,
	returnExpl?: boolean,
	currentState?: TimelineState
): boolean {

	if (_.isObject(expressionOrString) && expressionOrString) {
		const expression = expressionOrString as ExpressionObj

		log('resolveLogicalExpression',TraceLevel.TRACE)

		const l = resolveLogicalExpression(expression.l, obj, returnExpl, currentState)
		const r = resolveLogicalExpression(expression.r, obj, returnExpl, currentState)

		log('l: ' + l,TraceLevel.TRACE)
		log('o: ' + expression.o,TraceLevel.TRACE)
		log('r: ' + r,TraceLevel.TRACE)

		if (expression.o === '&') {
			// @ts-ignore return string is debug only
			if (returnExpl) return l + ' and ' + r
			return l && r
		}
		if (expression.o === '|') {
			// @ts-ignore return string is debug only
			if (returnExpl) return l + ' and ' + r
			return l || r
		}

	} else if (_.isString(expressionOrString)) {
		const expression: string = expressionOrString

		const m = expression.match(/!/g)
		const invert: number = (m ? m.length : 0) % 2

		const str: string = expression.replace(/!/g,'')

		const value: boolean = ((
			str: string,
			obj?: TimelineObject | TimelineKeyframe,
			returnExpl?: boolean
		): boolean => {
			if (isNumeric(str)) return !!parseInt(str, 10)

			let m: Array<string> | null = null

			let tmpStr = str.trim()

			if (
				tmpStr === '1' ||
				tmpStr.toLowerCase() === 'true'
			) {
				return true
			} else if (
				tmpStr === '0' ||
				tmpStr.toLowerCase() === 'false'
				) {
				return false
			}

			const filterAdd: Array<{
				t: string,
				val: string
			}> = []
			const filterRemove: Array<{
				t: string,
				val: string
			}> = []
			const objsToCheck: Array<TimelineResolvedObject> = []
			for (let i = 0;i < 10;i++) {

				m = tmpStr.match(/^([#\$\.])([^#\$\. ]+)(.*)/) // '$L12', '$L', '$G123.main#asdf'

				if (m) {
					if (
						m[1] === '$'	// Referring to a layer
					) {
						filterAdd.push({
							t: m[1],
							val: m[2]
						})
					} else if (
						m[1] === '#' ||	// Referring to an other object: '#id-of-object'
						m[1] === '.'	// Referring to a class of objects
					) {
						filterRemove.push({
							t: m[1],
							val: m[2]
						})
					}
					tmpStr = m[3].trim()
				} else {
					break
				}
			}

			let err = ''
			const explAdd: Array<string> = []
			const explRemove: Array<string> = []

			if (filterAdd.length) {
				_.each(filterAdd,function (add) {
					const m = add.val.match(/([GL])(.*)/i)
					if (m) {

						if (!isNumeric(m[2])) {
							err = m[2]
						}

						if ((m[1] || '').match(/L/i)) { // LLayer
							const LLayer = (
								m[2] ?
								m[2] :
								// @ts-ignore
								(obj || {}).LLayer || null
							)
							if (LLayer) {
								if (currentState && currentState.LLayers[LLayer]) {
									objsToCheck.push(currentState.LLayers[LLayer])
								}
							}
							if (m[2]) {
								explAdd.push('LLayer ' + (LLayer || 'N/A'))
							} else {
								explAdd.push('my LLayer')
							}

						} else if ((m[1] || '').match(/G/i)) {  // GLayer
							const GLayer = (
								m[2] ?
								m[2] :
								// @ts-ignore
								((obj || {}).content || { GLayer: null }).GLayer
							)
							if (GLayer) {
								if (currentState && currentState.GLayers[GLayer]) {
									objsToCheck.push(currentState.GLayers[GLayer])
								}

							}
							if (m[2]) {
								explAdd.push('GLayer ' + (GLayer || 'N/A'))
							} else {
								explAdd.push('my GLayer')
							}
						} else {
							err = add.val
						}
					} else {
						err = add.val
					}
				})
			} else {
				// check in all layers:
				if (currentState) {

					 _.each(currentState.LLayers,function (obj/*, LLayer*/) {
						objsToCheck.push(obj)
					})
					_.each(currentState.GLayers,function (obj/*, GLayer*/) {
						objsToCheck.push(obj)
					})
				}

				explAdd.push('any layer')
			}

			let found = false
			if (filterRemove.length) {
				found = true
				_.each(filterRemove,function (remove) {
					let obj
					if (remove.t === '#') { // id of an object
						explRemove.push('id "' + remove.val + '"')

						obj = _.find(objsToCheck,function (obj) {
							return obj.id === remove.val
						})
						if (!obj) found = false
					} else if (remove.t === '.') { // class of an object
						explRemove.push('class "' + remove.val + '"')
						obj = _.find(objsToCheck,function (obj) {
							return ((obj.classes || []).indexOf(remove.val) !== -1)
						})
						if (!obj) found = false
					} else {
						err = remove.t + remove.val
						found = false
					}
				})
			} else {
				explRemove.push('anyting')
				if (objsToCheck.length) found = true
			}

			const expl = explJoin(explRemove,', ',' and ') + ' is playing on ' + explJoin(explAdd,', ',' or ')

			if (err) throw Error('Unknown logical expression: "' + str + '" ("' + err + '")')

			// @ts-ignore return string is debug only
			if (returnExpl) return expl
			return found

		})(str, obj, returnExpl)

		if (returnExpl) {
			// @ts-ignore return string is debug only
			if (invert) return 'if not ' + value
			// @ts-ignore return string is debug only
			return 'if ' + value
		}

		if (invert) return !value
		return value

	} else if (_.isNumber(expressionOrString)) {
		return !!expressionOrString
	} else if (_.isBoolean(expressionOrString)) {
		return expressionOrString
	}
	throw Error('resolveLogicalExpression: unknown input: ' + expressionOrString + ' ')

}

function decipherTimeRelativeValue (
	str: string,
	whosAsking: WhosAskingTrace,
	getObjectAttribute: objAttributeFunction
): number | null {
	// Decipher a value related to the trigger type TIME_RELATIVE
	// Examples:
	// #asdf.end -2 // Relative to object asdf's end (plus 2 seconds)

	log('decipherTimeRelativeValue',TraceLevel.TRACE)

	try {

		const expression = interpretExpression(str)

		// resolve expression
		const value = (
			expression ?
			resolveExpression(
				expression,
				whosAsking,
				getObjectAttribute
			) :
			0
		)

		return value

	} catch (e) {
		console.log('error in expression: ')
		throw e
	}

}
function decipherLogicalValue (
	str: string | number,
	obj: TimelineObject | TimelineKeyframe,
	currentState: TimelineState,
	returnExpl?: boolean
): boolean | string {
	// Decipher a value related to the trigger type TIME_RELATIVE
	// Examples:
	/* Examples:
		'#asdf'		// id of object
		'$L1'		// special: LLayer 1 is not empty
		'$L'		// same LLayer as object
		'$G1'		// special: GLayer 1 is not empty
		'$G'		// same LLayer as object
		'.main'		// reference to a class (.classes)

		'$L.main'	// class main on LLayer
		'$L3#asdf'	// id asdf main on LLayer 3

		'.main & .second' // AND
		'.main | .second' // OR
		'.main | !.second' // OR NOT
	*/
	/*
		currentState: {
			GLayers: GLayers,
			LLayers: LLayers
		}

	*/

	log('decipherLogicalValue',TraceLevel.TRACE)

	try {

		const expression = interpretExpression(str,true)

		// resolve expression
		return resolveLogicalExpression(expression,obj,returnExpl, currentState)

	} catch (e) {
		console.log('error in expression: ')
		throw e
	}

}

function resolveState (tld: DevelopedTimeline,time: SomeTime): TimelineState {

	log('resolveState',TraceLevel.TRACE)
	const LLayers: {[layerId: string]: TimelineResolvedObject} = {}
	const GLayers: {[layerId: string]: TimelineResolvedObject} = {}
	let obj
	let obj2
	log('tld',TraceLevel.TRACE)
	log(tld,TraceLevel.TRACE)
	log('Resolved objects:',TraceLevel.TRACE)
	for (let i = 0; i < tld.resolved.length; i++) {

		obj = _.clone(tld.resolved[i])

		log(obj,TraceLevel.TRACE)
		if (
			(
				(obj.resolved.endTime || 0) > time ||
				obj.resolved.endTime === 0
			) &&
			(obj.resolved.startTime || 0) <= time &&
			!obj.resolved.disabled
		) {
			if (!LLayers[obj.LLayer]) {
				LLayers[obj.LLayer] = obj
			} else {
				// Priority:
				obj2 = LLayers[obj.LLayer]
				if (
					(
						(obj.priority || 0) > (obj2.priority || 0) 		// obj has higher priority => replaces obj2
					) || (
						(obj.priority || 0) === (obj2.priority || 0) &&
						(obj.resolved.startTime || 0) > (obj2.resolved.startTime || 0)			// obj starts later => replaces obj2
					)
				) {
					LLayers[obj.LLayer] = obj
				}
			}
		}
	}

	log('LLayers: ',TraceLevel.TRACE)
	log(LLayers,TraceLevel.TRACE)

	const getGLayer = function (obj: TimelineResolvedObject): string | number | null {
		if (_.has(obj.content,'GLayer')) return obj.content.GLayer
		if (_.has(obj,'LLayer')) return obj.LLayer
		if (obj.parent) return getGLayer(obj.parent)
		return null
	}

	for (const LLayer in LLayers) {
		obj = LLayers[LLayer]
		const GLayer = getGLayer(obj)

		if (GLayer !== null) {

			if (!GLayers[GLayer]) {
				GLayers[GLayer] = obj
			} else {
				// maybe add some better logic here, right now we use the LLayer index as a priority (higher LLayer => higher priority).
				obj2 = GLayers[GLayer]
				if (obj2.LLayer < obj.LLayer) {
					GLayers[GLayer] = obj
				}
			}
		}

	}
	log('GLayers, before logical: ',TraceLevel.TRACE)
	log(GLayers,TraceLevel.TRACE)

	// Logic expressions:
	const groupsOnState: {[id: string]: boolean} = {}
	const unresolvedLogicObjs: {[id: string]: UnresolvedLogicObject} = {}
	const addLogicalObj = (oOrg: TimelineResolvedObject | TimelineObject, parent?: TimelineGroup) => {
		if (oOrg.trigger.type === TriggerType.LOGICAL) {

			// ensure there's no startTime on obj

			const o: TimelineResolvedObject = _.clone(oOrg) as TimelineResolvedObject
			o.content = _.clone(o.content)
			if (o.resolved) {
				o.resolved.startTime = null
				o.resolved.endTime = null
				o.resolved.duration = null
			}

			if (parent) {
				o.parent = parent
			}
			if (unresolvedLogicObjs[o.id]) {
				// already there
				return false
			} else {
				unresolvedLogicObjs[o.id] = {
					prevOnTimeline: null,
					obj: o
				}
				return true
			}
		}
		return false
	}
	// Logical objects will be in the unresolved array:
	_.each(tld.unresolved, (o) => {
		addLogicalObj(o)
	})
	_.each(tld.groups, (o) => {
		if (o.isGroup && o.content && o.content.objects) {
			if (o.trigger.type === TriggerType.LOGICAL) {
				addLogicalObj(o)
			} else {
				groupsOnState[o.id] = true
			}
			_.each(o.content.objects, (child) => {
				addLogicalObj(child, o)
			})
		}
	})

	let hasChangedSomethingInIteration = true
	let iterationsLeft = _.keys(unresolvedLogicObjs).length + 2
	log('unresolvedLogicObjs',TraceLevel.TRACE)
	log(unresolvedLogicObjs,TraceLevel.TRACE)
	log('Logical objects:',TraceLevel.TRACE)
	while (hasChangedSomethingInIteration && iterationsLeft-- >= 0) {
		hasChangedSomethingInIteration = false

		_.each(unresolvedLogicObjs, function (o: UnresolvedLogicObject) {
			log(o,TraceLevel.TRACE)
			let onTimeLine = !!(decipherLogicalValue(o.obj.trigger.value, o.obj, {
				time: time,
				GLayers: GLayers,
				LLayers: LLayers
			}) && !o.obj.disabled)
			log('onTimeLine ' + onTimeLine,TraceLevel.TRACE)

			if (o.obj.isGroup) {
				groupsOnState[o.obj.id] = onTimeLine
				if (onTimeLine) {
					// a group isn't placed in the state, instead its children are evaluated
					if (o.obj.content && o.obj.content.objects) {
						_.each(o.obj.content.objects, (o2) => {
							if (addLogicalObj(o2, o.obj)) {
								iterationsLeft++
								hasChangedSomethingInIteration = true
							}
						})
					}
				}
			} else {
				if (o.obj.parent) {
					const parentId = o.obj.parent.id
					onTimeLine = (
						onTimeLine &&
						groupsOnState[parentId]
					)
				}

				const oldLLobj: TimelineResolvedObject | undefined = LLayers[o.obj.LLayer]
				const GLayer = getGLayer(o.obj) || 0
				const oldGLObj: TimelineResolvedObject | undefined = GLayers[GLayer]
				if (onTimeLine) {
					// Place in state, according to priority rules:

					if (
						!oldLLobj ||
						(o.obj.priority || 0) > (oldLLobj.priority || 0) // o.obj has higher priority => replaces oldLLobj
					) {
						LLayers[o.obj.LLayer] = o.obj
						if (
							!oldGLObj ||
							oldGLObj.LLayer <= o.obj.LLayer || // maybe add some better logic here, right now we use the LLayer index as a priority (higher LLayer => higher priority)
							(
								oldLLobj && oldGLObj.id === oldLLobj.id // the old object has just been replaced
							)
						) {
							GLayers[GLayer] = o.obj
						}
					}
					if (oldLLobj && oldLLobj.id !== LLayers[o.obj.LLayer].id) {
						// oldLLobj has been removed from LLayers
						// maybe remove it from GLayers as well?

						const GLayer = getGLayer(o.obj) || 0
						if (GLayers[GLayer].id === oldLLobj.id) {
							// yes, remove it:
							delete GLayers[GLayer]
						}
					}
				} else {
					// Object should not be in the state
					if (oldLLobj && oldLLobj.id === o.obj.id) {
						// remove the object then:
						delete LLayers[o.obj.LLayer]
					}
					if (oldGLObj && oldGLObj.id === o.obj.id) {
						// remove the object then:
						delete GLayers[GLayer]
					}
				}
			}
			if (
				(o.prevOnTimeline !== onTimeLine)
			) {
				hasChangedSomethingInIteration = true
				o.prevOnTimeline = onTimeLine
			}
		})
	}
	if (iterationsLeft <= 0) {
		log('Timeline Warning: Many Logical iterations, maybe there is a cyclic dependency?',TraceLevel.ERRORS)
	}

	log('GLayers: ',TraceLevel.TRACE)
	log(GLayers,TraceLevel.TRACE)

	return {
		time: time,
		GLayers: GLayers,
		LLayers: LLayers
	}
}

function evaluateKeyFrames (
	state: TimelineState,
	tld: DevelopedTimeline
): Array<TimelineResolvedKeyframe> {

	// prepare data
	const resolvedObjects: ResolvedObjectsStore = {}

	_.each(tld.resolved,function (obj) {
		resolvedObjects[obj.id] = obj
	})
	const allValidKeyFrames: Array<TimelineResolvedKeyframe> = []
	_.each(state.LLayers,function (obj) {
		if (!obj.resolved) obj.resolved = {}

		_.each(_.omit(obj.content,['GLayer']), function (val, key) {
			if (obj.resolved) obj.resolved[key] = _.clone(val)
		})

		if (obj.content && obj.content.templateData) {
			obj.resolved.templateData = _.clone(obj.content.templateData)
		}

		if (obj.content && obj.content.keyframes) {

			const resolvedKeyFrames: Array<TimelineResolvedKeyframe> = []
			const unresolvedKeyFrames: Array<TimelineKeyframe> = []

			let allObjects: {[id: string]: TimelineKeyframe | TimelineResolvedObject} = {}
			_.each(obj.content.keyframes,function (keyFrame: TimelineKeyframe) {
				allObjects[keyFrame.id] = keyFrame
			})
			allObjects = _.extend(allObjects, resolvedObjects)

			const getObjectAttribute = createGetObjectAttribute(allObjects)
			_.each(obj.content.keyframes, (kf: TimelineResolvedKeyframe) => {

				kf.parent = obj

				const startTime = getObjectAttribute(kf.id, 'start', [])
				getObjectAttribute(kf.id, 'start', [])
				getObjectAttribute(kf.id, 'duration', [])

				if (startTime) {
					resolvedKeyFrames.push(kf)
				} else {
					unresolvedKeyFrames.push(kf)

				}
			})

			// sort keyframes in ascending order:
			resolvedKeyFrames.sort((a,b) => {

				const aStartTime = (a.resolved || {}).startTime || 0
				const bStartTime = (b.resolved || {}).startTime || 0

				if (aStartTime > bStartTime) return 1
				if (aStartTime < bStartTime) return -1

				return 0
			})
			if (!obj.content) obj.content = {}

			// Apply keyframes
			_.each(resolvedKeyFrames,function (keyFrame) {

				const startTime = (keyFrame.resolved || {}).startTime || 0
				const endTime = (keyFrame.resolved || {}).endTime || 0

				if (
					startTime > 0 &&
					(!state.time || startTime <= state.time) &&
					(
						!endTime ||
						(!state.time || endTime > state.time)
					)
				) {

					let usingThisKeyframe = false

					if (keyFrame.content) {
						_.each(keyFrame.content, function (val, key) {

							if (_.isObject(val)) {
								if (!obj.resolved[key]) {
									obj.resolved[key] = {}
								}

								_.each(val, function (val1, attr) {
									// Apply keyframe to content:

									if (state.time) { // if no time is given, then don't apply
										// obj.resolved.mixer[attr] = val1
										obj.resolved[key][attr] = val1
									}
									usingThisKeyframe = true
								})
							} else {
								obj.resolved[key] = val
							}
						})
					}
					if (usingThisKeyframe) {
						allValidKeyFrames.push(_.extend({ parent: obj.id },keyFrame))
					}
				}
			})
		}
	})
	return allValidKeyFrames
}

function evaluateFunctions (state: TimelineState, tld: DevelopedTimeline, externalFunctions?: ExternalFunctions) {
	let triggernewResolveState = false

	if (externalFunctions && _.isObject(externalFunctions)) {

		_.each(state.LLayers,function (obj) {

			if (obj.externalFunction) {

				const fcn = externalFunctions[obj.externalFunction]

				if (fcn && _.isFunction(fcn)) {

					const value = !!fcn(obj,state,tld)

					triggernewResolveState = triggernewResolveState || value
				}
			}
		})
	}
	return triggernewResolveState
}

function isNumeric (num: any): boolean {
	return !isNaN(num)
}

function log (str: any, lvl: TraceLevel): void {
	if (traceLevel >= lvl) console.log(str)
}
function explJoin (arr: Array<string>,decimator: string,lastDecimator: string): string {

	if (arr.length === 1) {
		return arr[0]
	} else {

		const arr0 = arr.slice(0,-1)

		return arr0.join(decimator) + lastDecimator + arr.slice(-1)
	}
}

function sortObjects (arrayOfObjects: Array<TimelineResolvedObject>) {
	return arrayOfObjects.sort((a, b) => {

		const aStartTime = (a.resolved || {}).startTime || 0
		const bStartTime = (b.resolved || {}).startTime || 0

		if (aStartTime > bStartTime) return 1
		if (aStartTime < bStartTime) return -1

		const aEndTime = (a.resolved || {}).endTime || 0
		const bEndTime = (b.resolved || {}).endTime || 0

		if (aEndTime > bEndTime) return 1
		if (aEndTime < bEndTime) return -1

		return 0
	})
}
interface IterateResolveObjectsResult {
	unresolvedObjects: Array<TimelineObject>,
	resolvedObjects: Array<TimelineResolvedObject>
}
function iterateResolveObjects (
	unresolvedObjectsArray: Array<TimelineObject>
): IterateResolveObjectsResult {
	const result: IterateResolveObjectsResult = {
		unresolvedObjects: [],
		resolvedObjects: []
	}

	const allObjects: {[id: string]: TimelineResolvedObject} = {}

	const addObjectToAllObjects = (obj: TimelineResolvedObject) => {
		if (allObjects[obj.id]) throw Error('Object id "' + obj.id + '" is not unique!')
		allObjects[obj.id] = obj

		obj.resolved = {}

		if (obj.isGroup && obj.content && obj.content.objects) {
			_.each(obj.content.objects, (child: TimelineResolvedObject) => {
				child.parent = obj
				addObjectToAllObjects(child)
			})
		}
	}
	_.each(unresolvedObjectsArray, (obj: TimelineResolvedObject) => {
		addObjectToAllObjects(obj)
	})
	const getObjectAttribute = createGetObjectAttribute(allObjects)

	_.each(allObjects, (obj: TimelineResolvedObject) => {

		log('--------- Resolve object start: ' + obj.id,TraceLevel.TRACE)
		const startTime = getObjectAttribute(obj.id, 'start', 	[])
		log('startTime: ' + startTime,TraceLevel.TRACE)
		log('--------- Resolve object end: ' + obj.id,TraceLevel.TRACE)
		const endTime = getObjectAttribute(obj.id, 'end', 		[])
		log('endTime: ' + endTime,TraceLevel.TRACE)
		log('--------- Resolve object duration: ' + obj.id,TraceLevel.TRACE)
		const duration = getObjectAttribute(obj.id, 'duration', [])
		log('duration: ' + duration,TraceLevel.TRACE)

		if (isResolvedGood(obj)) {
			result.resolvedObjects.push(obj)
		} else {
			result.unresolvedObjects.push(obj)
		}
	})

	return result
}
function unshiftAndReturn<T> (arr?: Array<T>, ...objs: Array<T>): Array<T> {
	arr = arr || []
	// @ts-ignore
	return [].concat(objs, arr)
}
function printWhosAsking (whosAsking: WhosAskingTrace): string {
	return '[' + _.map(whosAsking, (str) => {
		return str
	}).join(', ') + ']'
}
function createGetObjectAttribute (allObjects: {[id: string]: any}) {
	const getObjectAttributeTouches: {[key: string]: true} = {}
	const touchOnce = (key: string, whosAsking: WhosAskingTrace): void => {
		if (getObjectAttributeTouches[key]) {
			throw new Error(key + ' is fetched several times, asked by ' + printWhosAsking(whosAsking))
		}
		getObjectAttributeTouches[key] = true
	}
	const getObjectAttribute: objAttributeFunction = (
		objId,
		hook,
		whosAsking
	) => {
		const key = objId + '_' + hook
		const obj: TimelineResolvedObject = allObjects[objId]
		if (!obj) {
			if (throwErrors) throw Error('Unknown object id "' + objId + '"')
			return null
		}
		if (!obj.resolved) obj.resolved = {}

		const imAsking = unshiftAndReturn(whosAsking, hook, obj.id)

		let returnValue: number | null | undefined = undefined
		if (hook === 'start') {
			if (_.has(obj.resolved,'startTime') && obj.resolved.startTime !== undefined) {
				returnValue = obj.resolved.startTime
			}
		} else if (hook === 'end') {
			if (_.has(obj.resolved,'endTime') && obj.resolved.endTime !== undefined) {
				returnValue = obj.resolved.endTime
			}
		} else if (hook === 'duration') {
			if (_.has(obj.resolved,'outerDuration') && obj.resolved.outerDuration !== undefined) {
				returnValue = obj.resolved.outerDuration
			}
		} else if (hook === 'parentStart') {
			if (_.has(obj.resolved,'parentStart') && obj.resolved.parentStart !== undefined) {
				returnValue = obj.resolved.parentStart
			}
		}

		if (returnValue !== undefined) return returnValue

		log('get ' + key + ' asked by ' + printWhosAsking(whosAsking), TraceLevel.TRACE)
		try {
			touchOnce(key, whosAsking)
		} catch (e) {
			if (throwErrors) {
				throw e
			} else {
				// it wasn't possible to determine the startTime
				return null
			}
		}

		if (hook === 'start') {
			obj.resolved.startTime = resolveObjectStartTime(obj, imAsking, getObjectAttribute)
			return obj.resolved.startTime
		} else if (hook === 'end') {
			obj.resolved.endTime = resolveObjectEndTime(obj, imAsking, getObjectAttribute)
			return obj.resolved.endTime
		} else if (hook === 'duration') {
			obj.resolved.outerDuration = resolveObjectDuration(obj, imAsking, getObjectAttribute)
			return obj.resolved.outerDuration
		} else if (hook === 'parentStart') {

			if (!obj.resolved.developed) {
				if (obj.parent) {
					obj.resolved.parentStart = getParentStartTime(
						obj.parent,
						unshiftAndReturn(whosAsking, obj.id),
						getObjectAttribute
					)
					return obj.resolved.parentStart
				}
			}
			obj.resolved.parentStart = null
			return obj.resolved.parentStart
		} else {
			throw Error('Unknown hook: "' + hook + '"')
		}
	}
	return getObjectAttribute
}
function isResolvedGood (obj: TimelineResolvedObject | TimelineResolvedKeyframe): boolean {
	if (obj.resolved) {
		const startTime = obj.resolved.startTime

		const startTimeIsOk = (
			(obj.parent && startTime !== null) || // inside a group, 0 is okay too
			startTime
		)

		const durationIsOk = (
			obj.resolved.outerDuration !== null &&
			obj.resolved.innerDuration !== null
		)
		return !!startTimeIsOk && !!durationIsOk
	}
	return false
}
export { Resolver }
