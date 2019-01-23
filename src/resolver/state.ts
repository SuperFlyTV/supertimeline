import {
	TimelineState,
	ResolvedTimeline,
	Time,
	ResolvedTimelineObject,
	TimelineObjectInstance,
	ResolvedTimelineObjectInstance
} from '../api/api'
import * as _ from 'underscore'
import { EventType } from '../api/enums'

export function getState (resolved: ResolvedTimeline, time: Time, eventLimit: number = 0): TimelineState {
	const state: TimelineState = {
		time: time,
		layers: {},
		nextEvents: []
	}
	if (!resolved.objects) throw new Error('getState: input data missing .objects attribute')
	_.each(resolved.objects, (obj: ResolvedTimelineObject) => {
		if (
			!obj.disabled &&
			obj.resolved.resolved
			) {
			_.each(obj.resolved.instances, (instance: TimelineObjectInstance) => {

				if (
					(
						instance.end === null ||
						instance.end > time
					) &&
					instance.start <= time
				) {
					const clone: ResolvedTimelineObjectInstance = _.extend(_.clone(obj),{
						instance: _.clone(instance)
					})
					if (!state.layers[obj.layer]) {
						state.layers[obj.layer] = clone
					} else {
						// Priority:
						const existingObj = state.layers[obj.layer]
						if (
							(
								(obj.priority || 0) > (existingObj.priority || 0) 		// obj has higher priority => replaces existingObj
							) || (
								(obj.priority || 0) === (existingObj.priority || 0) &&
								(instance.start || 0) > (existingObj.instance.start || 0)	// obj starts later => replaces existingObj
							)
						) {
							state.layers[obj.layer] = clone
						}
					}
				}

				if (instance.start > time) {

					state.nextEvents.push({
						type: EventType.START,
						time: instance.start,
						objId: obj.id
					})
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
				}
			})
		}
	})

	state.nextEvents.sort((a,b) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		if (a.type > b.type) return -1
		if (a.type < b.type) return 1

		if (a.objId > b.objId) return -1
		if (a.objId < b.objId) return 1

		return 0
	})

	if (eventLimit > 0 && state.nextEvents.length > eventLimit) state.nextEvents.splice(eventLimit) // delete the rest

	return state
}
