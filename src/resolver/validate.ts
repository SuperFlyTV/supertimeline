/* tslint:disable:strict-type-predicates */
import {
	TimelineObject, TimelineKeyframe
} from '../api/api'
import _ = require('underscore')

interface Ids {
	[id: string]: true
}
export function validateObject (obj: TimelineObject, strict?: boolean): void {
	validateObject0(obj, strict)
}
export function validateKeyframe (keyframe: TimelineKeyframe, strict?: boolean): void {
	validateKeyframe0(keyframe, strict)
}
function validateObject0 (obj: TimelineObject, strict?: boolean, uniqueIds?: Ids): void {
	if (!uniqueIds) uniqueIds = {}

	if (!obj) throw new Error(`Object is undefined`)
	if (!_.isObject(obj)) throw new Error(`Object is not an object`)

	if (!obj.id) throw new Error(`Object missing "id" attribute`)
	if (!_.isString(obj.id)) throw new Error(`Object "id" attribute is not a string: "${obj.id}"`)

	if (uniqueIds[obj.id]) throw new Error(`Object id "${obj.id}" is not unique`)
	uniqueIds[obj.id] = true

	// @ts-ignore
	if (obj.layer === undefined) throw new Error(`Object "${obj.id}": "layer" attribute is undefined`)

	if (!obj.content) throw new Error(`Object "${obj.id}": "content" attribute must be set`)
	if (!obj.enable) throw new Error(`Object "${obj.id}": "enable" attribute must be set`)

	if (obj.enable.start !== undefined) {
		if (strict && obj.enable.while !== undefined) throw new Error(`Object "${obj.id}": "enable.start" and "enable.while" cannot be combined`)

		if (
			strict &&
			obj.enable.end !== undefined &&
			obj.enable.duration !== undefined
		) throw new Error(`Object "${obj.id}": "enable.end" and "enable.duration" cannot be combined`)

	} else if (obj.enable.while !== undefined) {

		if (strict && obj.enable.end !== undefined) throw new Error(`Object "${obj.id}": "enable.while" and "enable.end" cannot be combined`)
		if (strict && obj.enable.duration !== undefined) throw new Error(`Object "${obj.id}": "enable.while" and "enable.duration" cannot be combined`)

	} else throw new Error(`Object "${obj.id}": "enable.start" or "enable.while" must be set`)

	if (obj.keyframes) {
		_.each(obj.keyframes, (keyframe, i) => {
			try {
				validateKeyframe0(keyframe, strict, uniqueIds)
			} catch (e) {
				throw new Error(`Object "${obj.id}" keyframe[${i}]: ${e}`)
			}
		})
	}
	if (obj.classes) {
		_.each(obj.classes, (className, i) => {
			if (className && !_.isString(className)) throw new Error(`Object "${obj.id}": "classes[${i}]" is not a string`)
		})
	}

	if (obj.children && !obj.isGroup) throw new Error(`Object "${obj.id}": attribute "children" is set but "isGroup" is not`)
	if (obj.isGroup && !obj.children) throw new Error(`Object "${obj.id}": attribute "isGroup" is set but "children" missing`)

	if (obj.children) {
		_.each(obj.children, (child, i) => {
			try {
				validateObject0(child, strict, uniqueIds)
			} catch (e) {
				throw new Error(`Object "${obj.id}" child[${i}]: ${e}`)
			}
		})
	}
	if (obj.priority !== undefined && !_.isNumber(obj.priority)) throw new Error(`Object "${obj.id}": attribute "priority" is not a number`)
}
function validateKeyframe0 (keyframe: TimelineKeyframe, strict?: boolean, uniqueIds?: Ids): void {
	if (!uniqueIds) uniqueIds = {}

	if (!keyframe) throw new Error(`Keyframe is undefined`)
	if (!_.isObject(keyframe)) throw new Error(`Keyframe is not an object`)

	if (!keyframe.id) throw new Error(`Keyframe missing id attribute`)
	if (!_.isString(keyframe.id)) throw new Error(`Keyframe id attribute is not a string: "${keyframe.id}"`)

	if (uniqueIds[keyframe.id]) throw new Error(`Keyframe id "${keyframe.id}" is not unique`)
	uniqueIds[keyframe.id] = true

	if (!keyframe.content) throw new Error(`Keyframe "${keyframe.id}": "content" attribute must be set`)
	if (!keyframe.enable) throw new Error(`Keyframe "${keyframe.id}": "enable" attribute must be set`)

	if (keyframe.enable.start !== undefined) {
		if (strict && keyframe.enable.while !== undefined) throw new Error(`Keyframe "${keyframe.id}": "enable.start" and "enable.while" cannot be combined`)

		if (
			strict &&
			keyframe.enable.end !== undefined &&
			keyframe.enable.duration !== undefined
		) throw new Error(`Keyframe "${keyframe.id}": "enable.end" and "enable.duration" cannot be combined`)

	} else if (keyframe.enable.while !== undefined) {

		if (strict && keyframe.enable.end !== undefined) throw new Error(`Keyframe "${keyframe.id}": "enable.while" and "enable.end" cannot be combined`)
		if (strict && keyframe.enable.duration !== undefined) throw new Error(`Keyframe "${keyframe.id}": "enable.while" and "enable.duration" cannot be combined`)

	} else throw new Error(`Keyframe "${keyframe.id}": "enable.start" or "enable.while" must be set`)

	if (keyframe.classes) {
		_.each(keyframe.classes, (className, i) => {
			if (className && !_.isString(className)) throw new Error(`Keyframe "${keyframe.id}": "classes[${i}]" is not a string`)
		})
	}
}

export function validateTimeline (timeline: Array<TimelineObject>, strict?: boolean) {
	const uniqueIds: {[id: string]: true} = {}
	_.each(timeline, (obj) => {
		validateObject0(obj, strict, uniqueIds)
	})
}
