
import * as _ from 'underscore'

import { TriggerType, TraceLevel, EventType } from '../enums/enums'
let clone = require('fast-clone')

let traceLevel: TraceLevel = TraceLevel.ERRORS // 0

export interface TimelineObject {
	id: ObjectId,
	trigger: {
		type: TriggerType,
		value: number|string // unix timestamp
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
}
export type TimeMaybe = number|null

export type StartTime = number|null
export type EndTime = number|null
export type Duration = number|null
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
		value: number|string // unix timestamp
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
	obj: TimelineObject

}
export interface TimelineResolvedObject extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineResolvedObject
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

	referralIndex?: number|null,
	referredObjectIds?: Array<{
		id: string,
		hook: string
	}>|null,

	repeatingStartTime?: StartTime,

	templateData?: any

	[key: string]: any
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
	[id: string]: TimelineResolvedObject|TimelineResolvedKeyframe
}

export type Expression = number|string|ExpressionObj
export interface ExpressionObj {
	l: Expression,
	o: string,
	r: Expression
}
export interface Filter {
	startTime?: StartTime,
	endTime?: EndTime,
}

class Resolver {
	static setTraceLevel (levelName: string|TraceLevel) {
		let lvl: any = TraceLevel.ERRORS
		if (_.isNumber(levelName)) lvl = levelName
		else if (levelName) lvl = TraceLevel[levelName] || TraceLevel.ERRORS
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
	static getState (data: UnresolvedTimeline|ResolvedTimeline,time: SomeTime,externalFunctions?: ExternalFunctions) {

		let tl = resolveTimeline(data,{
			/*
			startTime: time-1,
			endTime: time+1,
			*/ // removed filter because evaluateKeyFrames do need the whole timeline to function
		})

		let tld = developTimelineAroundTime(tl,time)
		// log(tl)

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
		let obj

		let tl: ResolvedTimeline = {
			resolved: [],
			unresolved: []
		}

		if (_.isArray(data)) {
			tl = resolveTimeline(data)
		} else if (_.isObject(data) && data.resolved) {
			tl = data
		}

		let tld = developTimelineAroundTime(tl,time)

		// Create a 'pseudo LLayers' here, it's composed of objects that are and some that might be...
		let LLayers: {[GLayer: string]: TimelineResolvedObject} = {}

		_.each(tl.resolved,function (obj: TimelineResolvedObject) {
			LLayers[obj.id] = obj
		})
		_.each(tl.unresolved,function (obj: TimelineObject) {
			if (obj.trigger.type === TriggerType.LOGICAL) {
				// we'll just assume that the object might be there when the time comes...
				let obj2 = obj as TimelineResolvedObject
				LLayers[obj.id] = obj2
			}
		})

		let keyframes = evaluateKeyFrames({
			LLayers: LLayers,
			GLayers: {},
			time: 0
		},tld)

		log('getNextEvents','TRACE')

		let nextEvents: Array<TimelineEvent> = []
		let usedObjIds = {}
		// let endCount = 0
		// let startCount = 0
		for (i = 0;i < tld.resolved.length;i++) {
			// if (count>0 && startCount >= count ) break
			obj = tld.resolved[i]

			if (
				obj.resolved.endTime >= time || // the object has not already finished
				obj.resolved.endTime === 0 // the object has no endTime
			 ) {
				if ( obj.resolved.startTime >= time ) { // the object has not started yet
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

			let keyFrame = keyframes[i]

			if (keyFrame &&
				keyFrame.parent &&
				keyFrame.resolved &&
				keyFrame.resolved.startTime
			) {

				if ( keyFrame.resolved.startTime >= time ) { // the object has not already started

					obj = usedObjIds[keyFrame.parent]
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

					obj = usedObjIds[keyFrame.parent]
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
		let tl = resolveTimeline(data,{
			startTime: startTime,
			endTime: endTime
		})
		log('tl','TRACE')
		log(tl,'TRACE')

		return tl
	}

	/*
	* startTime: unix time
	* endTime: unix time
	* returns an array of the objects that are relevant inside a window
	*/
	static getObjectsInWindow (data: UnresolvedTimeline, startTime: SomeTime, endTime?: SomeTime) {
		let tl = resolveTimeline(data,{
			startTime: startTime,
			endTime: endTime
		})
		// log('tl','TRACE')
		// log(tl,'TRACE')

		let tld = developTimelineAroundTime(tl,startTime)

		// log('tld','TRACE')
		// log(tld,'TRACE')
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
	static interpretExpression (strOrExpr,isLogical?: boolean) {
		return interpretExpression(strOrExpr,isLogical)
	}
	static resolveExpression (strOrExpr,resolvedObjects?: ResolvedObjectsStore, ctx?: ResolveExpressionContext) {
		return resolveExpression(strOrExpr, resolvedObjects, ctx)
	}
	static resolveLogicalExpression (
		expressionOrString: Expression|null,
		obj?: TimelineResolvedObject,
		returnExpl?: boolean,
		currentState?: TimelineState
	) {
		return resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState)
	}
	static developTimelineAroundTime (tl: ResolvedTimeline,time: SomeTime): DevelopedTimeline {
		return developTimelineAroundTime(tl, time)
	}

	static decipherLogicalValue (str,obj,currentState,returnExpl?: boolean) {
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
function resolveTimeline (data: UnresolvedTimeline|ResolvedTimeline, filter?: Filter): ResolvedTimeline {
	if (!filter) filter = {}
	if (!data) throw Error('resolveFullTimeline: parameter data missing!')

	// check: if data is infact a resolved timeline, then just return it:
	let unresolvedData: UnresolvedTimeline
	if (_.isObject(data) && data['resolved'] && data['unresolved'] ) {
		return data as ResolvedTimeline
	} else {
		unresolvedData = data as UnresolvedTimeline
	}

	log('resolveTimeline','TRACE')

	// Start resolving the triggers, i.e. resolve them into absolute times on the timeline:

	let resolvedObjects: {
		[id: string]: TimelineResolvedObject
	} = {}
	let unresolvedObjects: Array<TimelineObject> = []
	let objectIds: {
		[id: string]: boolean
	} = {}

	let checkArrayOfObjects = (arrayOfObjects) => {
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

	_.each(unresolvedData,function (obj) {
		if (obj) {
			if (!obj.content) obj.content = {}

			if (!_.has(obj.content,'GLayer')) {
				obj.content.GLayer = obj.LLayer
			}
			unresolvedObjects.push(obj)
			objectIds[obj.id] = true
		}
	})

	log('======= resolveTimeline: Starting iterating... ==============','TRACE')

	let hasAddedAnyObjects = true
	while (hasAddedAnyObjects) {
		hasAddedAnyObjects = false

		log('======= Iterating objects...','TRACE')

		for (let i = 0;i < unresolvedObjects.length;i++) {
			let obj: TimelineResolvedObject = _.extend(_.clone(unresolvedObjects[i]),{
				resolved: {}
			})
			if (obj) {

				log('--------------- object ' + obj.id,'TRACE')
				// if (!obj.resolved) obj.resolved = {}
				if (obj.disabled) obj.resolved.disabled = true

				let triggerTime: StartTime = null
				try {
					triggerTime = resolveObjectStartTime(obj, resolvedObjects)
				} catch (e) {
					console.log(e)
					triggerTime = null
				}
				if (triggerTime ) {
					log('resolved object ' + i,'TRACE')

					let outerDuration = resolveObjectDuration(obj,resolvedObjects)

					if (!_.isNull(outerDuration) && !_.isNull(obj.resolved.innerDuration)) {

						resolvedObjects[obj.id] = obj
						unresolvedObjects.splice(i,1)
						i--
						hasAddedAnyObjects = true // this will cause the iteration to run again
					} else {
						log('no duration','TRACE')
						log('outerDuration: ' + outerDuration,'TRACE')
					}

				}
				// log(obj)
				log(obj,'TRACE')

			}
		}
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

	log('developTimelineAroundTime ' + time,'TRACE')

	// let resolvedObjects = {}

	let tl2: DevelopedTimeline = {
		resolved: [],
		groups: [],
		unresolved: tl.unresolved
	}

	let getParentTime = function (obj) {
		let time = 0
		if (
			_.has(obj.resolved,'repeatingStartTime') &&
			!_.isNull(obj.resolved.repeatingStartTime)
		) {
			time = obj.resolved.repeatingStartTime

		} else if (obj.resolved.startTime) {
			time = obj.resolved.startTime
		}

		if (obj.parent) {
			time += getParentTime(obj.parent) - obj.parent.resolved.startTime
		}

		return time
	}

	let developObj = function (objClone: TimelineResolvedObject, givenParentObj?: TimelineResolvedObject) {

		log('developObj','TRACE')

		/*

		let tmpObj: TimelineResolvedObject = _.omit(objOrg,['parent'])
		if (tmpObj.content && tmpObj.content.objects) {
			let objects2: any = []

			_.each(tmpObj.content.objects, function (o) {
				objects2.push(_.omit(o,['parent']))
			})
			tmpObj.content.objects = objects2
		}
		let objClone: TimelineResolvedObject = clone(tmpObj)
		 */

		// console.log('tmpObj',tmpObj.content.objects)

		// let objClone: TimelineResolvedObject = clone(objOrg)

		objClone.resolved.innerStartTime = objClone.resolved.startTime
		objClone.resolved.innerEndTime = objClone.resolved.endTime

		let parentObj = givenParentObj || objClone.parent
		let parentTime = 0
		let parentIsRepeating = false
		if (parentObj) {
			parentTime = getParentTime(parentObj)
			objClone.resolved.parentId = parentObj.id

			parentIsRepeating = (
				_.has(parentObj.resolved,'repeatingStartTime') &&
				!_.isNull(parentObj.resolved.repeatingStartTime)
			)
		}

		objClone.resolved.startTime = (objClone.resolved.startTime || 0) + parentTime

		if (objClone.resolved.endTime) {
			objClone.resolved.endTime += parentTime
		}

		if (
			parentObj &&
			parentIsRepeating &&
			objClone.resolved.endTime &&
			objClone.resolved.startTime &&
			parentObj.resolved.innerDuration &&
			objClone.resolved.endTime < time
		) {
			// The object's playtime has already passed, move forward then:
			objClone.resolved.startTime += parentObj.resolved.innerDuration
			objClone.resolved.endTime += parentObj.resolved.innerDuration
		}

		// cap inside parent:
		if (parentObj &&
			objClone.resolved &&
			objClone.resolved.endTime &&
			parentObj.resolved &&
			parentObj.resolved.endTime &&
			objClone.resolved.endTime > parentObj.resolved.endTime
		) {
			objClone.resolved.endTime = parentObj.resolved.endTime
		}

		if (
			parentObj &&
			objClone.resolved.startTime &&
			parentObj.resolved.endTime &&
			parentObj.resolved.startTime &&
			objClone.resolved.endTime &&
			(
				objClone.resolved.startTime > parentObj.resolved.endTime ||
				objClone.resolved.endTime < parentObj.resolved.startTime
			)
		) {
			// we're outside parent, invalidate
			objClone.resolved.startTime = null
			objClone.resolved.endTime = null
		}

		log(objClone,'TRACE')

		if (objClone.repeating) {
			log('Repeating','TRACE')

			// let outerDuration = objClone.resolved.outerDuration;

			if (!objClone.resolved.innerDuration) throw Error('Object "#' + objClone.id + '" is repeating but missing innerDuration!')

			log('time: ' + time,'TRACE')
			log('innerDuration: ' + objClone.resolved.innerDuration,'TRACE')

			let repeatingStartTime = Math.max(
				(objClone.resolved.startTime || 0),
				time - ((time - (objClone.resolved.startTime || 0)) % objClone.resolved.innerDuration)
			) // This is the startTime closest to, and before, time

			log('repeatingStartTime: ' + repeatingStartTime, 'TRACE')

			objClone.resolved.repeatingStartTime = repeatingStartTime

		}

		if (objClone.isGroup) {
			if (objClone.content.objects) {
				_.each(objClone.content.objects,function (child: TimelineResolvedObject) {
					let newChild = clone(child)

					if (!newChild.parent) newChild.parent = objClone
					developObj(newChild,objClone)
				})
			} else {
				throw Error('.isGroup is set, but .content.objects is missing!')
			}

			tl2.groups.push(objClone)
		} else {
			tl2.resolved.push(objClone)
		}
	}

	// Develop and place on tl2:

	_.each(tl.resolved,function (resolvedObj) {
		let newObj = clone(resolvedObj)

		developObj(newObj)
	})

	tl2.resolved = sortObjects(tl2.resolved)

	return tl2
}

function resolveObjectStartTime (obj: TimelineResolvedObject|TimelineResolvedKeyframe, resolvedObjects: ResolvedObjectsStore): StartTime {
	// recursively resolve object trigger startTime
	if (!obj.resolved) obj.resolved = {}

	if (obj.trigger.type === TriggerType.TIME_ABSOLUTE) {

		let val: number
		if (_.isNumber(obj.trigger.value)) {
			val = obj.trigger.value
		} else {
			val = parseFloat(obj.trigger.value + '')
		}

		// Easy, return the absolute time then:
		obj.resolved.startTime = val

	} else if (obj.trigger.type === TriggerType.TIME_RELATIVE) {
		// ooh, it's a relative time! Relative to what, one might ask? Let's find out:

		if ( !_.has(obj.resolved,'startTime') || _.isNull(obj.resolved.startTime) ) {
			let o = decipherTimeRelativeValue(obj.trigger.value + '', resolvedObjects)
			obj.resolved.startTime = (o ? o.value : null)
			obj.resolved.referralIndex = (o ? o.referralIndex : null)
			obj.resolved.referredObjectIds = (o ? o.referredObjectIds : null)

			if (o && o.referredObjectIds) {
				_.each(o.referredObjectIds,function (ref) {
					let refObj = resolvedObjects[ref.id]
					if (refObj) {
						if (refObj.resolved.disabled) obj.resolved.disabled = true
					}
				})
			}
		}
	}

	resolveObjectEndTime(obj)

	let startTime: StartTime = null
	if (!_.isUndefined(obj.resolved.startTime)) {
		// @ts-ignore
		startTime = obj.resolved.startTime
	}

	return startTime

}
function resolveObjectDuration (obj: TimelineResolvedObject|TimelineResolvedKeyframe,resolvedObjects: ResolvedObjectsStore): Duration {
	// recursively resolve object duration

	if (!obj.resolved) obj.resolved = {}

	let outerDuration: Duration = obj.resolved.outerDuration || null
	let innerDuration: Duration = obj.resolved.innerDuration || null

	if (obj['isGroup']) {

		let obj0 = obj as TimelineResolvedObject

		if (!_.has(obj0.resolved,'outerDuration') ) {

			log('RESOLVE GROUP DURATION','TRACE')
			let lastEndTime: EndTime = -1
			let hasInfiniteDuration = false
			if (obj0.content && obj0.content.objects) {
				let obj0Clone = clone(obj0)

				_.each(obj0.content.objects, function (child: TimelineResolvedObject) {

					if (!child.parent) child.parent = obj0Clone

					if (!child.resolved) child.resolved = {}

					let startTime = resolveObjectStartTime(child,resolvedObjects)

					let outerDuration0 = resolveObjectDuration(child,resolvedObjects)

					if (!_.isNull(startTime) && !_.isNull(outerDuration0) && !_.isNull(child.resolved.innerDuration) ) {
						resolvedObjects[child.id] = child
					}

					log(child,'TRACE')

					if (child.resolved.endTime === 0) {
						hasInfiniteDuration = true
					}
					if ((child.resolved.endTime || 0) > (lastEndTime || 0)) {
						lastEndTime = child.resolved.endTime || 0
					}
				})
			}

			if (hasInfiniteDuration) {
				lastEndTime = 0
			} else {
				if (lastEndTime === -1) lastEndTime = null
			}

			obj.resolved.innerDuration = lastEndTime || 0

			outerDuration = (
				obj.duration > 0 || obj.duration === 0 ?
				obj.duration :
				(lastEndTime || 0)
			)
			obj.resolved.outerDuration = outerDuration

			log('GROUP DURATION: ' + obj.resolved.innerDuration + ', ' + obj.resolved.outerDuration,'TRACE')

		}

	} else {

		let contentDuration = (obj.content || {}).duration

		outerDuration = (
			obj.duration > 0 || obj.duration === 0 ?
			obj.duration :
			contentDuration
		)
		obj.resolved.outerDuration = outerDuration

		innerDuration = (
			contentDuration > 0 || contentDuration === 0 ?
			contentDuration :
			obj.duration
		)
		obj.resolved.innerDuration = innerDuration
	}

	resolveObjectEndTime(obj) // don't provide resolvedObjects here, that might cause an infinite loop

	return outerDuration

}

function resolveObjectEndTime (obj: TimelineResolvedObject|TimelineResolvedKeyframe, resolvedObjects?: ResolvedObjectsStore): EndTime {
	if (!obj.resolved) obj.resolved = {}

	if (!_.has(obj.resolved,'startTime') && resolvedObjects) {
		resolveObjectStartTime(obj, resolvedObjects)
	}
	if (!_.has(obj.resolved,'outerDuration') && resolvedObjects) {
		resolveObjectDuration(obj, resolvedObjects)
	}

	let endTime: EndTime = obj.resolved.endTime || null

	if (
		_.has(obj.resolved,'startTime') &&
		_.has(obj.resolved,'outerDuration') &&
		!_.isNull(obj.resolved.startTime) &&
		!_.isNull(obj.resolved.outerDuration)
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

function interpretExpression (strOrExpr: string | number | Expression, isLogical?: boolean): Expression|null {

	// note: the order is the priority!
	let operatorList = ['+','-','*','/']
	if (isLogical) {
		operatorList = ['&','|']
	}

	let wordIsOperator = function (word) {
		if (operatorList.indexOf(word) !== -1) return true
		return false
	}
	let regexpOperators = ''
	_.each(operatorList,function (o) {
		regexpOperators += '\\' + o
	})

	let expression: Expression|null = null

	if (strOrExpr) {

		if (_.isString(strOrExpr) || _.isNumber(strOrExpr)) {

			let str: string = strOrExpr + ''
			// Prepare the string:
			// Make sure all operators (+-/*) have spaces between them

			// str = str.replace(/([\(\)\*\/+-])/g,' $1 ')
			// log(str)
			// log(new RegExp('(['+regexpOperators+'])','g'))
			str = str.replace(new RegExp('([' + regexpOperators + '\\(\\)])','g'),' $1 ') // Make sure there's a space between every operator & operand

			let words = _.compact(str.split(' '))

			if (words.length === 0) return null // empty expression

			// Fix special case: a + - b
			for (let i = words.length - 2; i >= 1; i--) {
				if ( ( words[i] === '-' || words[i] === '+') && wordIsOperator(words[i - 1]) ) {
					words[i] = words[i] + words[i + 1]
					words.splice(i + 1,1)
				}
			}
			// wrap up parentheses:
			let wrapInnerExpressions = function (words) {
				for (let i = 0; i < words.length; i++) {

					// if (words[i] == ')') throw 'decipherTimeRelativeValue: syntax error: ')' encountered.'

					if (words[i] === '(') {
						let tmp = wrapInnerExpressions(words.slice(i + 1))

						// insert inner expression and remove tha
						words[i] = tmp.inner
						words.splice(i + 1,tmp.inner.length + 1)
					}

					if (words[i] === ')') {
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

			let tmp = wrapInnerExpressions(words)

			if (tmp.rest.length) throw Error('interpretExpression: syntax error: parentheses don\'t add up in "' + str + '".')

			let expressionArray = tmp.inner

			if (expressionArray.length % 2 !== 1) throw Error('interpretExpression: operands & operators don\'t add up: "' + expressionArray.join(' ') + '".')

			let getExpression = function (words) {

				if (!words || !words.length) throw Error('interpretExpression: syntax error: unbalanced expression')

				if (words.length === 1 && _.isArray(words[0])) words = words[0]

				if (words.length === 1) return words[0]

				// priority order: /, *, -, +

				let operatorI = -1

				/*if (operatorI == -1) {

					for (let i in words) {
						if (words[i] == '+' || words[i] == '-') {
							operatorI = parseInt(i)
							break
						}
					}
				}
				if (operatorI == -1) operatorI = words.indexOf('*')
				if (operatorI == -1) operatorI = words.indexOf('/')
				*/
				_.each(operatorList,function (operator) {
					if (operatorI === -1) {
						operatorI = words.indexOf(operator)
					}
				})

				if (operatorI !== -1) {
					let o = {
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

	let validateExpression = function (expr0: Expression, breadcrumbs?: string) {
		if (!breadcrumbs) breadcrumbs = 'ROOT'

		if (_.isObject(expr0)) {

			let expr: ExpressionObj = expr0 as ExpressionObj

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
		let errStr = JSON.stringify(expression)
		throw Error(errStr + ' ' + e)
	}

	log('expression: ','TRACE')
	log(expression,'TRACE')
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
	touchedObjectIDs: Array<{id: string,hook: string}>,
	referralIndex: number
}
function resolveExpression (
	expression0: Expression,
	resolvedObjects?: ResolvedObjectsStore,
	ctx?: ResolveExpressionContext
) {

	resolvedObjects = resolvedObjects || {}
	ctx = ctx || {
		touchedObjectExpressions: {},
		touchedObjectIDs: [],
		referralIndex: 0
	}

	if (_.isObject(expression0)) {

		let expression: ExpressionObj = expression0 as ExpressionObj

		log('resolveExpression','TRACE')

		let l = resolveExpression(expression.l, resolvedObjects, ctx)
		let r = resolveExpression(expression.r, resolvedObjects, ctx)

		log('l: ' + l,'TRACE')
		log('o: ' + expression.o,'TRACE')
		log('r: ' + r,'TRACE')

		if (_.isNull(l)) return null
		if (_.isNull(r)) return null

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
			let expression: string = expression0 + ''

			if (expression[0] === '#') { // Referring to an other object: '#id-of-object'

				if (_.has(ctx.touchedObjectExpressions,expression)) return ctx.touchedObjectExpressions[expression] // to improve performance and avoid circular dependencies
				ctx.touchedObjectExpressions[expression] = null // to avoid circular dependencies

				//

				let words = expression.slice(1).split('.')
				let hook = 'end'
				if (words.length === 2) {
					hook = words[1]
				}

				ctx.touchedObjectIDs.push({
					id: words[0],
					hook: hook
				})

				let obj = resolvedObjects[words[0]]
				if (!obj) {
					log('obj "' + words[0] + '" not found','TRACE')
					return null
				}

				let referredObjValue: StartTime = (
					_.has(obj.resolved,'startTime') ?
					(obj.resolved.startTime || 0) :
					resolveObjectStartTime(obj,resolvedObjects)
				)

				let objReferralIndex = ((obj.resolved || {}).referralIndex || 0) + 1
				if (objReferralIndex > ctx.referralIndex) ctx.referralIndex = objReferralIndex

				let val: StartTime = null
				if (hook === 'start') {
					val = referredObjValue
				} else if (hook === 'end') {
					if (
						(referredObjValue || referredObjValue === 0) &&
						obj.resolved.outerDuration
					) {
						val = referredObjValue + obj.resolved.outerDuration
					}
				} else if (hook === 'duration') {
					if (obj.resolved.outerDuration) {
						val = obj.resolved.outerDuration
					}
				} else {
					throw Error('Unknown hook: "' + expression + '"')
				}

				ctx.touchedObjectExpressions[expression] = val

				return val
			}
		}

	}
	return null
}
function resolveLogicalExpression (
	expressionOrString: Expression|null,
	obj?: TimelineObject | TimelineKeyframe,
	returnExpl?: boolean,
	currentState?: TimelineState
) {
	// todo:

	if (_.isObject(expressionOrString) && expressionOrString) {
		let expression = expressionOrString as ExpressionObj

		log('resolveLogicalExpression','TRACE')

		let l = resolveLogicalExpression(expression.l, obj, returnExpl, currentState)
		let r = resolveLogicalExpression(expression.r, obj, returnExpl, currentState)

		log('l: ' + l,'TRACE')
		log('o: ' + expression.o,'TRACE')
		log('r: ' + r,'TRACE')

		if (_.isNull(l) || _.isNull(r) ) {
			if (returnExpl) return '-null-'
			return null
		}

		if (expression.o === '&') {
			if (returnExpl) return l + ' and ' + r
			return l && r
		}
		if (expression.o === '|') {
			if (returnExpl) return l + ' and ' + r
			return l || r
		}

	} else if (_.isString(expressionOrString)) {
		let expression = expressionOrString as string

		let m = expression.match(/!/g)
		let invert = (m ? m.length : 0) % 2

		let str = expression.replace(/!/g,'')

		let value = ((str,obj,returnExpl) => {
			if (isNumeric(str)) return !!parseInt(str, 10)

			let m: Array<string>|null = null

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

			let filterAdd: Array<{
				t: string,
				val: string
			}> = []
			let filterRemove: Array<{
				t: string,
				val: string
			}> = []
			let objsToCheck: Array<TimelineResolvedObject> = []
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
			let explAdd: Array<string> = []
			let explRemove: Array<string> = []

			if (filterAdd.length) {
				// log('filterAdd')
				// log(filterAdd)
				_.each(filterAdd,function (add) {
					let m = add.val.match(/([GL])(.*)/i)
					if (m) {

						if (!isNumeric(m[2])) {
							err = m[2]
						}

						if ((m[1] || '').match(/L/i)) { // LLayer
							let LLayer = (
								m[2] ?
								m[2] :
								(obj || {})['LLayer'] || null
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
							let GLayer = (
								m[2] ?
								m[2] :
								((obj || {})['content'] || {GLayer: null}).GLayer
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

			let expl = explJoin(explRemove,', ',' and ') + ' is playing on ' + explJoin(explAdd,', ',' or ')

			if (err) throw Error('Unknown logical expression: "' + str + '" ("' + err + '")')

			if (returnExpl) return expl
			return found

		})(str,obj,returnExpl)

		if (returnExpl) {
			if (invert) return 'if not ' + value
			return 'if ' + value
		}

		if (invert) return !value
		return value

	} else if (_.isNumber(expressionOrString)) {
		return expressionOrString as number
	}
	return null

}

function decipherTimeRelativeValue (str: string, resolvedObjects: ResolvedObjectsStore) {
	// Decipher a value related to the trigger type TIME_RELATIVE
	// Examples:
	// #asdf.end -2 // Relative to object asdf's end (plus 2 seconds)

	log('decipherTimeRelativeValue','TRACE')

	try {

		let resolveExpressionContext: ResolveExpressionContext = {
			touchedObjectExpressions: {},
			touchedObjectIDs: [],
			referralIndex: 0
		}

		let expression = interpretExpression(str)

		// resolve expression
		let value = (
			expression ?
			resolveExpression(
				expression,
				resolvedObjects,
				resolveExpressionContext
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
function decipherLogicalValue (str: string | number,
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

	log('decipherTimeRelativeValue','TRACE')

	// let referralIndex = 0

	try {

		// let touchedObjectExpressions = {}
		// let touchedObjectIDs = []

		let expression = interpretExpression(str,true)

		// resolve expression
		return resolveLogicalExpression(expression,obj,returnExpl, currentState)

	} catch (e) {
		console.log('error in expression: ')
		throw e
	}

}

function resolveState (tld: DevelopedTimeline,time: SomeTime): TimelineState {

	log('resolveState','TRACE')
	// log('resolveState '+time)
	let LLayers = {}
	let obj
	let obj2

	for (let i = 0; i < tld.resolved.length; i++) {

		obj = _.clone(tld.resolved[i])

		log(obj,'TRACE')

		if (
			(
				obj.resolved.endTime > time ||
				obj.resolved.endTime === 0
			) &&
			obj.resolved.startTime <= time &&
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
						obj.resolved.startTime > obj2.resolved.startTime			// obj starts later => replaces obj2
					) || (
						(obj.priority || 0) === (obj2.priority || 0) &&
						obj.resolved.startTime === obj2.resolved.startTime &&
						obj.resolved.referralIndex > obj2.resolved.referralIndex 	// obj has a higher referralIndex => replaces obj2
					)
				) {
					LLayers[obj.LLayer] = obj
				}
			}
		}
	}

	log('LLayers: ','TRACE')
	log(LLayers,'TRACE')

	let getGLayer = function (obj) {
		if (_.has(obj.content,'GLayer')) return obj.content.GLayer
		if (obj.parent) return getGLayer(obj.parent)
		return null
	}

	let GLayers = {}

	for (let LLayer in LLayers) {
		obj = LLayers[LLayer]
		let GLayer = getGLayer(obj) || 0

		if (!_.isNull(GLayer)) {

			if (!GLayers[GLayer]) {
				GLayers[GLayer] = obj
			} else {
				// maybe add some better logic here, right now we use the LLayer index as a priority (higher LLayer => higher priority).
				obj2 = GLayers[GLayer]
				if (obj2.LLayer < obj.LLayer ) {
					GLayers[GLayer] = obj
				}
			}
		}

	}
	log('GLayers: ','TRACE')
	log(GLayers,'TRACE')

	// Logic expressions:
	let unresolvedLogicObjs: Array<UnresolvedLogicObject> = []

	_.each(tld.unresolved,function (o) {
		if (o.trigger.type === TriggerType.LOGICAL) {

			// ensure there's no startTime on obj

			if (o['resolved']) {
				o['resolved'].startTime = null
				o['resolved'].endTime = null
				o['resolved'].duration = null
			}

			unresolvedLogicObjs.push({
				prevOnTimeline: null,
				obj: o
			})
		}
	})

	let hasChangedSomethingInIteration = true
	let iterationsLeft = unresolvedLogicObjs.length

	while ( hasChangedSomethingInIteration && iterationsLeft-- >= 0) {
		hasChangedSomethingInIteration = false

		_.each(unresolvedLogicObjs, function (o) {

			let onTimeLine = decipherLogicalValue(o.obj.trigger.value, o.obj, {
				time: time,
				GLayers: GLayers,
				LLayers: LLayers
			})
			if (onTimeLine && !o.obj.disabled) {
				let oldLLobj = LLayers[o.obj.LLayer]

				if (
					!oldLLobj ||
					(o.obj.priority || 0) > (oldLLobj.priority || 0) // o.obj has higher priority => replaces oldLLobj
				) {
					LLayers[o.obj.LLayer] = o.obj

					let GLayer = getGLayer(o.obj) || 0

					let oldGLObj = GLayers[GLayer]
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

					let GLayer = getGLayer(o.obj) || 0

					if (GLayers[GLayer].id === oldLLobj.id) {
						// yes, remove it:
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

	return {
		time: time,
		GLayers: GLayers,
		LLayers: LLayers
	}
}

function evaluateKeyFrames (state: TimelineState,tld: DevelopedTimeline): Array<TimelineResolvedKeyframe> {

	// prepare data
	let resolvedObjects: ResolvedObjectsStore = {}

	_.each(tld.resolved,function (obj) {
		resolvedObjects[obj.id] = obj
	})

	let allValidKeyFrames: Array<TimelineResolvedKeyframe> = []

	_.each(state.LLayers,function (obj) {

		if (!obj.resolved) obj.resolved = {}

		_.each(_.omit(obj.content,['GLayer']), function (val, key) {
			if (obj.resolved) obj.resolved[key] = _.clone(val)
		})

		if (obj.content && obj.content.templateData) {
			obj.resolved.templateData = _.clone(obj.content.templateData)
		}

		if (obj.content && obj.content.keyframes ) {

			let resolvedKeyFrames: Array<TimelineResolvedKeyframe> = []

			let unresolvedKeyFrames: Array<TimelineKeyframe> = []
			_.each(obj.content.keyframes,function (keyFrame: TimelineKeyframe) {
				unresolvedKeyFrames.push(keyFrame)
			})

			let resolvedObjectsInternal: ResolvedObjectsStore = _.clone(resolvedObjects)

			let hasAddedAnyObjects = true
			while (hasAddedAnyObjects) {
				hasAddedAnyObjects = false

				for (let i = 0;i < unresolvedKeyFrames.length;i++) {
					let keyFrame: TimelineResolvedKeyframe = _.extend(_.clone(unresolvedKeyFrames[i]),{
						resolved: {}
					})

					if (keyFrame && keyFrame.trigger) {

						let triggerTime: TimeMaybe = null

						if (keyFrame.trigger.type === TriggerType.LOGICAL) {
							let onTimeLine = decipherLogicalValue(keyFrame.trigger.value, keyFrame, state )

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

							resolveObjectEndTime(keyFrame,resolvedObjectsInternal)

						} else {

							resolveObjectEndTime(keyFrame,resolvedObjectsInternal)

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

				let aStartTime = (a.resolved || {}).startTime || 0
				let bStartTime = (b.resolved || {}).startTime || 0

				if (aStartTime > bStartTime) return 1
				if (aStartTime < bStartTime) return -1

				return 0
			})
			if (!obj.content) obj.content = {}

			// Apply keyframes
			_.each(resolvedKeyFrames,function (keyFrame) {

				let startTime = (keyFrame.resolved || {}).startTime || 0
				let endTime = (keyFrame.resolved || {}).endTime || 0

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
						allValidKeyFrames.push(_.extend({parent: obj.id},keyFrame))
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

				let fcn = externalFunctions[obj.externalFunction]

				if (fcn && _.isFunction(fcn)) {

					let value = !!fcn(obj,state,tld)

					triggernewResolveState = triggernewResolveState || value
				}
			}
		})
	}
	return triggernewResolveState
}

function isNumeric (num): boolean {
	return !isNaN(num)
}

function log (str: any,levelName): void {
	let lvl: any = TraceLevel.ERRORS
	if (levelName) lvl = TraceLevel[levelName] || 0

	if (traceLevel >= lvl ) console.log(str)
}
function explJoin (arr: Array<string>,decimator: string,lastDecimator: string): string {

	if (arr.length === 1) {
		return arr[0]
	} else {

		let arr0 = arr.slice(0,-1)

		return arr0.join(decimator) + lastDecimator + arr.slice(-1)
	}
}

function sortObjects (arrayOfObjects) {
	return arrayOfObjects.sort((a, b) => {

		let aStartTime = (a.resolved || {}).startTime || 0
		let bStartTime = (b.resolved || {}).startTime || 0

		if (aStartTime > bStartTime) return 1
		if (aStartTime < bStartTime) return -1

		let aEndTime = (a.resolved || {}).endTime || 0
		let bEndTime = (b.resolved || {}).endTime || 0

		if (aEndTime > bEndTime) return 1
		if (aEndTime < bEndTime) return -1

		return 0
	})
}

export { Resolver }
