import { validateObject, validateKeyframe, validateTimeline } from '../validate'
import { TimelineObject, TimelineKeyframe } from '../../api/api'
import _ = require('underscore')

describe('validate', () => {
	const obj: TimelineObject = {
		id: 'obj0',
		enable: {
			start: 10
		},
		layer: '1',
		content: {}
	}
	const keyframe: TimelineKeyframe = {
		id: 'kf0',
		enable: {
			start: 10,
			end: 14
		},
		content: {}
	}
	const timeline: TimelineObject[] = [
		{
			id: 'obj1',
			enable: {
				start: 1000
			},
			layer: '1',
			content: {}
		},
		{
			id: 'obj2',
			enable: {
				while: 1
			},
			layer: '1',
			content: {}
		}
	]
	test('validateObject', () => {
		expect(() => {
			validateObject(obj, true)
		}).not.toThrowError()

		expect(() => {
			// @ts-ignore
			validateObject(undefined, true)
		}).toThrowError()
		expect(() => {
			// @ts-ignore
			validateObject(1337, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.id
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			// @ts-ignore
			o.id = 1337
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.enable
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.enable = _.clone(o.enable)
			o.enable.while = 32
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.enable = {
				start: 10,
				end: 32,
				duration: 22
			}
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.enable = {
				while: 1,
				end: 32
			}
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.enable = {
				while: 1,
				duration: 10
			}
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.layer
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.content
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			// @ts-ignore
			o.classes = ['123', 124]
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			// @ts-ignore
			o.priority = '2'
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.children = _.clone(timeline)
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.children = _.clone(timeline)
			o.isGroup = true
			validateObject(o, true)
		}).not.toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.children = [
				_.clone(timeline[0]),
				_.clone(timeline[1])
			]
			o.isGroup = true
			// @ts-ignore
			o.children[0].id = 123
			validateObject(o, true)
		}).toThrowError()
	})
	test('validateKeyframe', () => {
		expect(() => {
			validateKeyframe(keyframe, true)
		}).not.toThrowError()

		expect(() => {
			// @ts-ignore
			validateKeyframe(undefined, true)
		}).toThrowError()

		expect(() => {
			// @ts-ignore
			validateKeyframe('abc', true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.id
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			// @ts-ignore
			o.id = 12
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.enable
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			o.enable = _.clone(o.enable)
			o.enable.while = 32
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			o.enable = {
				start: 10,
				end: 32,
				duration: 22
			}
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			o.enable = {
				while: 1,
				end: 32
			}
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			o.enable = {
				while: 1,
				duration: 10
			}
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			o.enable = _.clone(o.enable)
			delete o.enable.start
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.content
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			// @ts-ignore
			o.classes = ['123', 124]
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.keyframes = [
				_.clone(keyframe)
			]
			validateObject(o, true)
		}).not.toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.keyframes = [
				_.clone(keyframe)
			]
			// @ts-ignore
			o.keyframes[0].id = 13
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			o.keyframes = [
				_.clone(keyframe)
			]
			// @ts-ignore
			o.keyframes[0].id = obj.id
			validateObject(o, true)
		}).toThrowError()
	})
	test('validateTimeline', () => {
		expect(() => {
			const tl = _.clone(timeline)
			validateTimeline(tl, false)
		}).not.toThrowError()

		expect(() => {
			const tl = _.clone(timeline)
			tl[1].id = tl[0].id
			validateTimeline(tl, false)
		}).toThrowError()
	})
})
