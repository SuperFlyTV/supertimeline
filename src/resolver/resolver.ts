
import * as _ from 'underscore'

import { TriggerType, TraceLevel, EventType } from '../enums/enums'

let traceLevel: TraceLevel = TraceLevel.ERRORS // 0
let CIRCULAR_LIMIT: number = 10
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
	parent?: ObjectId
}
export interface ResolvedDetails {
	startTime?: StartTime,
	endTime?: EndTime,
	innerStartTime?: StartTime,
	innerEndTime?: EndTime,
	innerDuration?: Duration
	outerDuration?: Duration,
	parentId?: ObjectId,
	disabled?: boolean,

	referralIndex?: number | null,
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
type WhosAskingTrace = Array<TimelineResolvedObject | TimelineResolvedKeyframe>
type ReferencedObjects = {[objId: string]: true}
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
	static setCircularLimit (limit: number) {
		CIRCULAR_LIMIT = limit
	}
	static getCircularLimit (): number {
		return CIRCULAR_LIMIT
	}
	/*
	 * getState
	 * time [optional] unix time, default: now
	 * returns the current state
	*/
	static getState (data: UnresolvedTimeline | ResolvedTimeline,time: SomeTime,externalFunctions?: ExternalFunctions) {

		const tl = resolveTimeline(data,{
			/*
			startTime: time-1,
			endTime: time+1,
			*/ // removed filter because evaluateKeyFrames do need the whole timeline to function
		})

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

		let i

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
		// let endCount = 0
		// let startCount = 0
		for (i = 0;i < tld.resolved.length;i++) {
			// if (count>0 && startCount >= count ) break
			const obj: TimelineResolvedObject = tld.resolved[i]

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
					// startCount++
				}
				if (obj.resolved.endTime) {

					nextEvents.push({
						type: EventType.END,
						time: obj.resolved.endTime,
						obj: obj
					})

				}
				// endCount++

				usedObjIds[obj.id] = obj

			}
		}
		_.each(tl.unresolved,function (obj) {
			if (obj.trigger.type === TriggerType.LOGICAL) {
				usedObjIds[obj.id] = obj
			}
		})

		for (i = 0; i < keyframes.length;i++) {

			const keyFrame = keyframes[i]

			if (keyFrame &&
				keyFrame.parent &&
				keyFrame.resolved &&
				keyFrame.resolved.startTime
			) {

				if (keyFrame.resolved.startTime >= time) { // the object has not already started

					const obj = usedObjIds[keyFrame.parent]
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

					const obj = usedObjIds[keyFrame.parent]
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

		}

		nextEvents.sort((a,b) => {
			if (a.time > b.time) return 1
			if (a.time < b.time) return -1

			if (a.type > b.type) return -1
			if (a.type < b.type) return 1

			return 0
		})

		/*nextEvents = _.sortBy(nextEvents,function (e) {
			return e.time
		})*/

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
		// log('tl',TraceLevel.TRACE)
		// log(tl,TraceLevel.TRACE)

		const tld = developTimelineAroundTime(tl,startTime)

		// log('tld',TraceLevel.TRACE)
		// log(tld,TraceLevel.TRACE)
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
		resolvedObjects?: ResolvedObjectsStore,
		ctx?: ResolveExpressionContext,
		whosAsking?: WhosAskingTrace
	) {
		return resolveExpression(strOrExpr, resolvedObjects, ctx, whosAsking)
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

	const resolveObjectTouches: ResolvedObjectTouches = {}

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

	log('======= resolveTimeline: Starting iterating... ==============',TraceLevel.TRACE)

	let hasAddedAnyObjects = true
	while (hasAddedAnyObjects) {
		hasAddedAnyObjects = false

		const clonedUnresolvedObjects = _.map(unresolvedObjects, (o: any) => {
			const o2 = _.clone(o)
			// o2.content = _.clone(o2.content)
			return o2
		})
		const result = iterateResolveObjects(clonedUnresolvedObjects, resolvedObjects, resolveObjectTouches)

		unresolvedObjects = result.unresolvedObjects
	}
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

	// let resolvedObjects = {}

	const tl2: DevelopedTimeline = {
		resolved: [],
		groups: [],
		unresolved: tl.unresolved
	}

	_.each(tl.resolved,function (resolvedObj) {
		// let newObj = clone(resolvedObj)
		developObj(tl2, time, resolvedObj)
	})

	tl2.resolved = sortObjects(tl2.resolved)

	return tl2
}
function getParentStartTime (
	obj: TimelineResolvedObject,
	whosAsking: WhosAskingTrace,
	resolveParentStartTime?: boolean,
	resolvedObjects?: ResolvedObjectsStore,
	resolveObjectTouches?: ResolvedObjectTouches,
	referencedObjectIds?: ReferencedObjects
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
		// if (resolveParentStartTime) {
		if (resolvedObjects && resolveObjectTouches) {
			time = resolveObjectStartTime(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)
		}
		// }
	}
	if (time === null) return time

	if (obj.parent && !obj.resolved.developed) {
		const parentTime = getParentStartTime(
			obj.parent,
			unshiftAndReturn(whosAsking, obj),
			resolveParentStartTime,
			resolvedObjects,
			resolveObjectTouches,
			referencedObjectIds
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
	givenParentObj?: TimelineResolvedObject,
	referencedObjectIds?: ReferencedObjects
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
			parentTime = getParentStartTime(parentObj, [returnObj])
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

		// let outerDuration = objNOTClone.resolved.outerDuration;

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
				developObj(tl2, time, newChild, returnObj, referencedObjectIds)
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
	resolvedObjects: ResolvedObjectsStore,
	resolveObjectTouches: ResolvedObjectTouches,
	referencedObjectIds?: ReferencedObjects
): StartTime {
	// recursively resolve object trigger startTime
	touchResolveObject(obj.id + '_start', whosAsking, resolveObjectTouches)

	if (!obj.resolved) obj.resolved = {}

	if (obj.trigger.type === TriggerType.TIME_ABSOLUTE) {

		let startTime: number
		if (_.isNumber(obj.trigger.value)) {
			startTime = obj.trigger.value
		} else {
			startTime = parseFloat(obj.trigger.value + '')
		}
		if (obj.parent && typeof obj.parent === 'object') {
			const parentTime = getParentStartTime(
				obj.parent,
				unshiftAndReturn(whosAsking, obj),
				true,
				resolvedObjects,
				resolveObjectTouches,
				referencedObjectIds
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
			const o = decipherTimeRelativeValue(obj.trigger.value + '', resolvedObjects, [obj])
			if (referencedObjectIds) {
				_.each(o.referredObjectIds, (oid) => {
					referencedObjectIds[oid.id] = true
				})
			}
			obj.resolved.startTime = (o ? o.value : null)
			obj.resolved.developed = true
			updateReferralIndex(obj, (o ? o.referralIndex : null))
			updateReferredObjectIds(obj, (o ? o.referredObjectIds : null), resolvedObjects)
		}
	}

	resolveObjectEndTime(obj, whosAsking, null, null, referencedObjectIds)

	let startTime: StartTime = null
	if (typeof obj.resolved.startTime !== 'undefined') {
		startTime = obj.resolved.startTime
	}

	return startTime

}
function resolveObjectDuration (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	whosAsking: WhosAskingTrace,
	resolvedObjects: ResolvedObjectsStore,
	resolveObjectTouches: ResolvedObjectTouches,
	referencedObjectIds?: ReferencedObjects
): Duration {
	// recursively resolve object duration
	touchResolveObject(obj.id + '_duration', whosAsking, resolveObjectTouches)

	if (!obj.resolved) obj.resolved = {}

	let outerDuration: Duration = obj.resolved.outerDuration || null
	let innerDuration: Duration = obj.resolved.innerDuration || null

	const resolveDuration = (obj: TimelineResolvedObject | TimelineResolvedKeyframe): Duration => {
		if (_.isString(obj.duration)) {
			// if (!_.isNaN(parseFloat(obj.duration))) return parseFloat(obj.duration)

			const o = decipherTimeRelativeValue(obj.duration + '', resolvedObjects, [obj])
			if (referencedObjectIds) {
				_.each(o.referredObjectIds, (oid) => {
					referencedObjectIds[oid.id] = true
				})
			}

			updateReferralIndex(obj, (o ? o.referralIndex : null))
			updateReferredObjectIds(obj, (o ? o.referredObjectIds : null), resolvedObjects)
			return (o ? o.value : null)

		}
		return obj.duration
	}

	// @ts-ignore check if object is a group
	if (obj.isGroup) {

		const obj0 = obj as TimelineResolvedObject

		if (!_.has(obj.resolved,'outerDuration')) {

			let result: IterateResolveObjectsResult = {
				lastEndTime: null,
				hasInfiniteDuration: false,
				unresolvedObjects: [],
				resolvedObjects: [],
				referencedObjectIds: {}
			}
			const startTime = resolveObjectStartTime(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)

			log('RESOLVE GROUP DURATION ' + obj.id,TraceLevel.TRACE)
			// let lastEndTime: EndTime = -1
			// let hasInfiniteDuration = false
			if (startTime) {
				if (obj.content && obj.content.objects) {
					// let obj = clone(obj)
					if (!obj.content.hasClonedChildren) { // we should clone out children, so that we wont affect the original objects
						obj.content.hasClonedChildren = true
						obj.content.objects = _.map(obj.content.objects, (o: any) => {
							const o2 = _.clone(o)
							o2.content = _.clone(o2.content)
							return o2
						})
					}
					result = iterateResolveObjects(obj.content.objects, resolvedObjects, resolveObjectTouches, obj0)
					obj.content.objects = result.resolvedObjects.concat(result.unresolvedObjects as Array<any>)
				}
			} else {
				log('Cannot resolve group duration, has no own startTime ' + obj.id,TraceLevel.TRACE)
			}

			innerDuration = (result.lastEndTime || 0) - (startTime || 0)
			obj.resolved.innerDuration = innerDuration
			const duration = resolveDuration(obj)
			if (duration !== null) {
				outerDuration = (
					(duration || 0) > 0 || duration === 0 ?
					duration :
					(result.lastEndTime || 0)
				)
				obj.resolved.outerDuration = outerDuration
			}
			log('GROUP DURATION: ' + obj.resolved.innerDuration + ', ' + obj.resolved.outerDuration,TraceLevel.TRACE)
		}

	} else {

		const contentDuration = (obj.content || {}).duration
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

	resolveObjectEndTime(obj, whosAsking, null, null, referencedObjectIds) // don't provide resolvedObjects here, that might cause an infinite loop
	// resolveObjectEndTime(obj) // don't provide resolvedObjects here, that might cause an infinite loop

	return outerDuration

}

function resolveObjectEndTime (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	whosAsking: WhosAskingTrace,
	resolvedObjects: ResolvedObjectsStore | null,
	resolveObjectTouches: ResolvedObjectTouches | null,
	referencedObjectIds?: ReferencedObjects
): EndTime {
	if (!obj.resolved) obj.resolved = {}
	touchResolveObject(obj.id + '_end', whosAsking, resolveObjectTouches)

	if (resolvedObjects && resolveObjectTouches) {
		if (!_.has(obj.resolved,'startTime')) {
			resolveObjectStartTime(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)
		}
		if (!_.has(obj.resolved,'outerDuration')) {
			resolveObjectDuration(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)
		}
	}

	let endTime: EndTime = obj.resolved.endTime || null

	if (
		_.has(obj.resolved,'startTime') &&
		_.has(obj.resolved,'outerDuration') &&
		obj.resolved.startTime !== null &&
		obj.resolved.outerDuration !== null
	) {
		if (obj.resolved.outerDuration) {
			endTime = (obj.resolved.startTime || 0) + obj.resolved.outerDuration
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

			// str = str.replace(/([\(\)\*\/+-])/g,' $1 ')
			// log(str)
			// log(new RegExp('(['+regexpOperators+'])','g'))
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
			// type WordsArray = Array<string | WordsArray>
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
export interface ResolveExpressionContext {
	touchedObjectExpressions: {[expression: string]: any },
	touchedObjectIDs: TouchedObjectIds,
	referralIndex: number
}
type TouchedObjectIds = Array<{id: string, hook: string}>
function resolveExpression (
	expression0: Expression,
	resolvedObjects?: ResolvedObjectsStore,
	ctx?: ResolveExpressionContext,
	whosAsking?: WhosAskingTrace,
	resolveObjectTouches0?: ResolvedObjectTouches,
	referencedObjectIds?: ReferencedObjects
): number | null {
	resolvedObjects = resolvedObjects || {}
	ctx = ctx || {
		touchedObjectExpressions: {},
		touchedObjectIDs: [],
		referralIndex: 0
	}
	const resolveObjectTouches: ResolvedObjectTouches = resolveObjectTouches0 || {}

	if (_.isObject(expression0)) {

		const expression: ExpressionObj = expression0 as ExpressionObj

		log('resolveExpression',TraceLevel.TRACE)

		const l = resolveExpression(expression.l, resolvedObjects, ctx, whosAsking)
		const r = resolveExpression(expression.r, resolvedObjects, ctx, whosAsking)

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

				if (_.has(ctx.touchedObjectExpressions,expression)) return ctx.touchedObjectExpressions[expression] // to improve performance and avoid circular dependencies
				ctx.touchedObjectExpressions[expression] = null // to avoid circular dependencies

				//

				const words = expression.slice(1).split('.')
				let hook = 'end'
				if (words.length === 2) {
					hook = words[1]
				}
				let obj: TimelineResolvedObject | TimelineResolvedKeyframe | null = null
				if (words[0] === '') { // for example: "#.end" references "#self.end"
					obj = (whosAsking ? whosAsking[0] : null)
				} else {
					const objId = words[0]

					obj = resolvedObjects[objId]
					ctx.touchedObjectIDs.push({
						id: objId,
						hook: hook
					})
				}
				if (!obj) {
					log('obj "' + words[0] + '" not found',TraceLevel.TRACE)
					return null
				}

				const objReferralIndex = ((obj.resolved || {}).referralIndex || 0) + 1
				if (objReferralIndex > ctx.referralIndex) ctx.referralIndex = objReferralIndex

				const getReferredStartTime = (
					obj: TimelineResolvedObject | TimelineResolvedKeyframe,
					whosAsking: WhosAskingTrace,
					resolvedObjects: ResolvedObjectsStore,
					referencedObjectIds?: ReferencedObjects
				): StartTime => {

					let startTime = (
						_.has(obj.resolved,'startTime') ?
						(obj.resolved.startTime || 0) :
						resolveObjectStartTime(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)
					)
					if (startTime !== null) {

						if (!obj.resolved.developed) {
							if (obj.parent && typeof obj.parent === 'object') {
								const parentTime = getParentStartTime(
									obj.parent,
									unshiftAndReturn(whosAsking, obj),
									true,
									resolvedObjects,
									resolveObjectTouches,
									referencedObjectIds
								)
								if (parentTime !== null) {
									startTime = startTime + parentTime
								}
							}
						}
					}

					return startTime
				}
				const getReferredDuration = (
					obj: TimelineResolvedObject | TimelineResolvedKeyframe,
					whosAsking: WhosAskingTrace,
					resolvedObjects: ResolvedObjectsStore,
					referencedObjectIds?: ReferencedObjects
				): Duration => {
					return (
						_.has(obj.resolved,'outerDuration') ?
						(obj.resolved.outerDuration || null) :
						resolveObjectDuration(obj, whosAsking, resolvedObjects, resolveObjectTouches, referencedObjectIds)
					)
				}

				let val: StartTime = null
				if (hook === 'start') {
					val = getReferredStartTime(obj, whosAsking || [], resolvedObjects, referencedObjectIds)
				} else if (hook === 'end') {
					const startTime = getReferredStartTime(obj, whosAsking || [], resolvedObjects, referencedObjectIds)
					const duration = getReferredDuration(obj, whosAsking || [], resolvedObjects, referencedObjectIds)
					if ((startTime || startTime === 0) && duration) {
						val = startTime + duration
					}
				} else if (hook === 'duration') {
					val = getReferredDuration(obj, whosAsking || [], resolvedObjects, referencedObjectIds)
				} else {
					throw Error('Unknown hook: "' + expression + '"')
				}

				ctx.touchedObjectExpressions[expression] = val

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
	// todo:

	if (_.isObject(expressionOrString) && expressionOrString) {
		const expression = expressionOrString as ExpressionObj

		log('resolveLogicalExpression',TraceLevel.TRACE)

		const l = resolveLogicalExpression(expression.l, obj, returnExpl, currentState)
		const r = resolveLogicalExpression(expression.r, obj, returnExpl, currentState)

		log('l: ' + l,TraceLevel.TRACE)
		log('o: ' + expression.o,TraceLevel.TRACE)
		log('r: ' + r,TraceLevel.TRACE)

		// if (l === null || r === null) {
		// 	// @ts-ignore return string is debug only
		// 	if (returnExpl) return '-null-'
		// 	return null
		// }

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
				// log('filterAdd')
				// log(filterAdd)
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
							// log('obj on LL '+LLayer)
							// log(currentState.LLayers[LLayer])
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

					// let m = remove.val.match(/([\$\.])(.*)/)
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
	resolvedObjects: ResolvedObjectsStore,
	whosAsking: WhosAskingTrace
): {
	value: number | null,
	referralIndex: number,
	referredObjectIds: TouchedObjectIds
} {
	// Decipher a value related to the trigger type TIME_RELATIVE
	// Examples:
	// #asdf.end -2 // Relative to object asdf's end (plus 2 seconds)

	log('decipherTimeRelativeValue',TraceLevel.TRACE)

	try {

		const resolveExpressionContext: ResolveExpressionContext = {
			touchedObjectExpressions: {},
			touchedObjectIDs: [],
			referralIndex: 0
		}

		const expression = interpretExpression(str)

		// resolve expression
		const value = (
			expression ?
			resolveExpression(
				expression,
				resolvedObjects,
				resolveExpressionContext,
				whosAsking
			) :
			0
		)

		return {
			value: value,
			referralIndex: resolveExpressionContext.referralIndex,
			referredObjectIds: resolveExpressionContext.touchedObjectIDs
		}

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

	// let referralIndex = 0

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
	// log('resolveState '+time)
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
			// log(obj)
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
					) || (
						(obj.priority || 0) === (obj2.priority || 0) &&
						obj.resolved.startTime === obj2.resolved.startTime &&
						(obj.resolved.referralIndex || 0) > (obj2.resolved.referralIndex || 0) 	// obj has a higher referralIndex => replaces obj2
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

function evaluateKeyFrames (state: TimelineState,tld: DevelopedTimeline): Array<TimelineResolvedKeyframe> {

	// prepare data
	const resolvedObjects: ResolvedObjectsStore = {}

	_.each(tld.resolved,function (obj) {
		resolvedObjects[obj.id] = obj
	})

	const allValidKeyFrames: Array<TimelineResolvedKeyframe> = []

	const resolveObjectTouches: ResolvedObjectTouches = {}

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
			_.each(obj.content.keyframes,function (keyFrame: TimelineKeyframe) {
				unresolvedKeyFrames.push(keyFrame)
			})

			const resolvedObjectsInternal: ResolvedObjectsStore = _.clone(resolvedObjects)

			let hasAddedAnyObjects = true
			while (hasAddedAnyObjects) {
				hasAddedAnyObjects = false

				for (let i = 0;i < unresolvedKeyFrames.length;i++) {
					const keyFrame: TimelineResolvedKeyframe = _.extend(_.clone(unresolvedKeyFrames[i]),{
						resolved: {}
					})

					if (keyFrame && keyFrame.trigger) {

						let triggerTime: TimeMaybe = null

						if (keyFrame.trigger.type === TriggerType.LOGICAL) {
							const onTimeLine = decipherLogicalValue(keyFrame.trigger.value, keyFrame, state)

							if (onTimeLine) {
								triggerTime = 1
								keyFrame.resolved.startTime = triggerTime

							}
						} else if (keyFrame.trigger.type === TriggerType.TIME_ABSOLUTE) {
							// relative to parent start time

							let val: number
							if (_.isNumber(keyFrame.trigger.value)) {
								val = keyFrame.trigger.value
							} else {
								val = parseFloat(keyFrame.trigger.value + '')
							}

							if (obj.resolved.startTime) {
								triggerTime = val + obj.resolved.startTime
							} else {
								triggerTime = (val ? 1 : 0)
							}
							if (triggerTime) keyFrame.resolved.startTime = triggerTime

							resolveObjectEndTime(keyFrame, [obj], resolvedObjectsInternal, resolveObjectTouches)

						} else {

							resolveObjectEndTime(keyFrame, [obj], resolvedObjectsInternal, resolveObjectTouches)

							triggerTime = keyFrame.resolved.startTime || null

						}
						if (triggerTime) {

							if (keyFrame.id) {
								resolvedObjectsInternal[keyFrame.id] = keyFrame
							}
							resolvedKeyFrames.push(keyFrame)

							unresolvedKeyFrames.splice(i,1)
							i--
							hasAddedAnyObjects = true // this will cause the iteration to run again
						}

					}
				}
			}

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
					/*
					if (keyFrame.templateData) {

						if (_.isObject(obj.resolved.templateData) && _.isObject(keyFrame.templateData)) {

							_.extend(obj.resolved.templateData, keyFrame.templateData)
						} else {
							obj.resolved.templateData = keyFrame.templateData
						}
						usingThisKeyframe = true
					}
					*/

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
function updateReferralIndex (obj: TimelineResolvedObject | TimelineResolvedKeyframe, referralIndex: number | null) {
	obj.resolved.referralIndex = Math.max(obj.resolved.referralIndex || 0, referralIndex || 0)
}
function updateReferredObjectIds (
	obj: TimelineResolvedObject | TimelineResolvedKeyframe,
	referredObjectIds: Array<ResolvedObjectId> | null,
	resolvedObjects: ResolvedObjectsStore
) {
	if (!obj.resolved.referredObjectIds) obj.resolved.referredObjectIds = []

	if (referredObjectIds) {
		obj.resolved.referredObjectIds = obj.resolved.referredObjectIds.concat(referredObjectIds)
	}

	_.each(obj.resolved.referredObjectIds,function (ref) {
		const refObj = resolvedObjects[ref.id]
		if (refObj) {
			if (refObj.resolved.disabled) obj.resolved.disabled = true
		}
	})
}
function touchResolveObject (
	key: string,
	whosAsking: WhosAskingTrace,
	resolveObjectTouches?: ResolvedObjectTouches | null
) {
	if (resolveObjectTouches) {
		const count = (resolveObjectTouches[key] || 0) + 1
		resolveObjectTouches[key] = count
		if (count > CIRCULAR_LIMIT) {
			throw Error('Circular reference(' + count + '): ' + key + ', trace: ' + printWhosAsking(whosAsking))
		}
	}
}
interface IterateResolveObjectsResult {
	lastEndTime: EndTime
	hasInfiniteDuration: boolean,
	unresolvedObjects: Array<TimelineObject>,
	resolvedObjects: Array<TimelineResolvedObject>,
	referencedObjectIds: ReferencedObjects
}
function iterateResolveObjects (
	unresolvedObjectsArray: Array<TimelineObject>,
	resolvedObjects: ResolvedObjectsStore,
	resolveObjectTouches: ResolvedObjectTouches,
	parentObj?: TimelineResolvedObject
): IterateResolveObjectsResult {
	const result: IterateResolveObjectsResult = {
		lastEndTime: -1,
		hasInfiniteDuration: false,
		unresolvedObjects: [],
		resolvedObjects: [],
		referencedObjectIds: {}
	}

	let hasAddedAnyObjects = true
	while (hasAddedAnyObjects) {
		hasAddedAnyObjects = false

		if (parentObj) {
			log('======= Iterating objects in ' + parentObj.id + '...',TraceLevel.TRACE)
		} else {
			log('======= Iterating objects...',TraceLevel.TRACE)
		}

		for (let i = 0; i < unresolvedObjects.length; i++) {
		// _.each(unresolvedObjects, (obj: TimelineResolvedObject) => {
			// @ts-ignore resolved attribute is added later
			const obj: TimelineResolvedObject = unresolvedObjects[i]

			if (obj) {
				if (!obj.resolved) obj.resolved = {}

				if (parentObj && !obj.parent) obj.parent = parentObj

				log('--------------- object ' + obj.id,TraceLevel.TRACE)
				// if (!obj.resolved) obj.resolved = {}
				if (obj.disabled) obj.resolved.disabled = true

				let startTime: StartTime = null
				try {
					startTime = resolveObjectStartTime(obj, resolvedObjects, resolveObjectTouches)
				} catch (e) {
					console.log(e)
					startTime = null
				}
				const startTimeIsOk = (
					(parentObj && startTime !== null) || // inside a group, 0 is okay too
					startTime
				)
				if (startTimeIsOk) {
					const outerDuration = resolveObjectDuration(obj,resolvedObjects, resolveObjectTouches)
					if (
						outerDuration !== null &&
						obj.resolved.innerDuration !== null
					) {
						log('resolved object ' + obj.id,TraceLevel.TRACE)

						resolvedObjects[obj.id] = obj
						unresolvedObjects.splice(i,1)
						result.resolvedObjects.push(obj)
						i--
						hasAddedAnyObjects = true // this will cause the iteration to run again
					} else {
						log('no duration',TraceLevel.TRACE)
						log('outerDuration: ' + outerDuration,TraceLevel.TRACE)
					}

				} else {
					log('object not resolved',TraceLevel.TRACE)
				}

				if (obj.resolved.endTime === 0) {
					result.hasInfiniteDuration = true
				}
				if ((obj.resolved.endTime || 0) > (result.lastEndTime || 0)) {
					result.lastEndTime = obj.resolved.endTime || 0
				}
				// log(obj)
				log(obj,TraceLevel.TRACE)

			}
		}
		result.unresolvedObjects = unresolvedObjects
		if (result.hasInfiniteDuration) {
			result.lastEndTime = 0
		} else {
			if (result.lastEndTime === -1) result.lastEndTime = null
		}
	}
	return result
}
function unshiftAndReturn<T> (arr?: Array<T>, ...objs: Array<T>): Array<T> {
	arr = arr || []
	arr.unshift(...objs)
	return arr
}
function printWhosAsking (whosAsking: WhosAskingTrace): string {
	return _.map(whosAsking, (o) => {
		return (o.id || o)
	}).join(', ') || '[none]'
}
export { Resolver }
