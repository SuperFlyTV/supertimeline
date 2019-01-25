import {
	TimelineState,
	ResolvedTimeline,
	Time,
	ResolvedTimelineObject,
	TimelineObjectInstance,
	ResolvedTimelineObjectInstance,
	Content
} from '../api/api'
import * as _ from 'underscore'
import { EventType } from '../api/enums'
import { extendMandadory } from '../lib'

export function getState (resolved: ResolvedTimeline, time: Time, eventLimit: number = 0): TimelineState {
	const state: TimelineState = {
		time: time,
		layers: {},
		nextEvents: []
	}
	if (!resolved.objects) throw new Error('getState: input data missing .objects attribute')

	const resolvedObjects = _.values(resolved.objects)

	// Sort to make sure parent groups are evaluated before their children:
	resolvedObjects.sort((a, b) => {
		if ((a.resolved.levelDeep || 0) > (b.resolved.levelDeep || 0)) return 1
		if ((a.resolved.levelDeep || 0) < (b.resolved.levelDeep || 0)) return -1
		return 0
	})
	const activeObjIds: {[id: string]: ResolvedTimelineObjectInstance} = {}
	const eventObjectTimes: {[time: string]: EventType} = {}
	_.each(resolvedObjects, (obj: ResolvedTimelineObject) => {
		if (
			!obj.disabled &&
			obj.resolved.resolved &&
			!obj.resolved.isKeyframe
		) {
			_.each(obj.resolved.instances, (instance: TimelineObjectInstance) => {

				if (obj.layer) { // if layer is empty, don't put in state
					if (
						// object instance is active:
						(
							instance.end === null ||
							instance.end > time
						) &&
						instance.start <= time
					) {

						const parentObj = (
							obj.resolved.parentId ?
							resolved.objects[obj.resolved.parentId] :
							null
						)
						// If object has a parent, only set if parent is on layer (if layer is set for parent)
						if (
							!obj.resolved.parentId ||
							(
								parentObj &&
								(
									!parentObj.layer ||
									activeObjIds[parentObj.id]
								)
							)
						) {
							const clone: ResolvedTimelineObjectInstance = extendMandadory<ResolvedTimelineObject, ResolvedTimelineObjectInstance>(_.clone(obj),{
								instance: _.clone(instance)
							})
							clone.content = JSON.parse(JSON.stringify(clone.content))
							let setObj: boolean = false
							const existingObj = state.layers[obj.layer]
							if (!existingObj) {
								setObj = true
							} else {
								// Priority:
								if (
									(
										(obj.priority || 0) > (existingObj.priority || 0) 		// obj has higher priority => replaces existingObj
									) || (
										(obj.priority || 0) === (existingObj.priority || 0) &&
										(instance.start || 0) > (existingObj.instance.start || 0)	// obj starts later => replaces existingObj
									)
								) {
									setObj = true
								}
							}
							if (setObj) {
								if (existingObj) {
									// replace object on layer:
									delete activeObjIds[existingObj.id]
								}
								state.layers[obj.layer] = clone
								activeObjIds[clone.id] = clone
							}
						}
					}
					if (instance.start > time) {

						state.nextEvents.push({
							type: EventType.START,
							time: instance.start,
							objId: obj.id
						})
						eventObjectTimes['' + instance.start] = EventType.START
					}
					if (
						instance.end !== null &&
						instance.end > time
					) {
						state.nextEvents.push({
							type: EventType.END,
							time: instance.end,
							objId: obj.id
						})
						eventObjectTimes['' + instance.end] = EventType.END
					}
				}

			})
		}
	})

	// _.each(state.layers, (obj) => {
	// 	activeObjIds[obj.id] = obj
	// })

	// Keyframes:
	const keyframes: ResolvedTimelineObjectInstance[] = []
	_.each(resolved.objects, (obj: ResolvedTimelineObject) => {
		if (
			!obj.disabled &&
			obj.resolved.resolved &&
			obj.resolved.isKeyframe &&
			obj.resolved.parentId
		) {
			_.each(obj.resolved.instances, (instance: TimelineObjectInstance) => {
				const kf: ResolvedTimelineObjectInstance = extendMandadory<ResolvedTimelineObject, ResolvedTimelineObjectInstance>(obj,{
					instance: instance
				})
				keyframes.push(kf)

				if (
					instance.start > time &&
					eventObjectTimes['' + instance.start] === undefined // no need to put a keyframe event if there's already another event
				) {
					state.nextEvents.push({
						type: EventType.KEYFRAME,
						time: instance.start,
						objId: obj.id
					})
					eventObjectTimes['' + instance.start] = EventType.KEYFRAME
				}
				if (
					instance.end !== null &&
					instance.end > time &&
					eventObjectTimes['' + instance.end] === undefined // no need to put a keyframe event if there's already another event
				) {
					state.nextEvents.push({
						type: EventType.KEYFRAME,
						time: instance.end,
						objId: obj.id
					})
					eventObjectTimes['' + instance.end] = EventType.KEYFRAME
				}
			})
		}
	})
	keyframes.sort((a,b) => {
		if (a.instance.start > b.instance.start) return 1
		if (a.instance.start < b.instance.start) return -1

		if (a.id > b.id) return -1
		if (a.id < b.id) return 1

		return 0
	})
	_.each(keyframes, (keyframe: ResolvedTimelineObjectInstance) => {

		if (keyframe.resolved.parentId) {
			const parentObj = activeObjIds[keyframe.resolved.parentId]
			if (parentObj) {  // keyframe is on an active object

				if (
					// keyframe instance is active:
					(
						keyframe.instance.end === null ||
						keyframe.instance.end > time
					) &&
					keyframe.instance.start <= time &&
					// keyframe is within the keyframe.instance of its parent:
					keyframe.instance.start >= parentObj.instance.start &&
					(
						parentObj.instance.end === null ||
						keyframe.instance.start < parentObj.instance.end
					)
				) {

					applyKeyframeContent(parentObj.content, keyframe.content)
				}
			}
		}
	})

	state.nextEvents.sort((a,b) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		if (a.type > b.type) return -1
		if (a.type < b.type) return 1

		if (a.objId < b.objId) return -1
		if (a.objId > b.objId) return 1

		return 0
	})

	if (eventLimit > 0 && state.nextEvents.length > eventLimit) state.nextEvents.splice(eventLimit) // delete the rest

	return state
}
export function applyKeyframeContent (parentContent: Content, keyframeContent: Content) {
	_.each(keyframeContent, (value: any, attr: string) => {
		if (_.isArray(value)) {
			if (!_.isArray(parentContent[attr])) parentContent[attr] = []
			applyKeyframeContent(parentContent[attr], value)
			parentContent[attr].splice(value.length, 99999)
		} else if (_.isObject(value)) {
			if (
				!_.isObject(parentContent[attr]) ||
				_.isArray(parentContent[attr])
			) parentContent[attr] = {}
			applyKeyframeContent(parentContent[attr], value)
		} else {
			parentContent[attr] = value
		}
	})
}
