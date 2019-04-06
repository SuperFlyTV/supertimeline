import { validateObject, validateKeyframe, validateTimeline } from '../validate'
import { TimelineObject, TimelineKeyframe } from '../../api/api'
import _ = require('underscore')

describe('validate', () => {
	const obj: TimelineObject = {
		id: 'obj0',
		enable: {},
		layer: '1',
		content: {}
	}
	const keyframe: TimelineKeyframe = {
		id: 'obj0',
		enable: {},
		content: {}
	}
	const timeline: TimelineObject[] = [
		{
			id: 'obj0',
			enable: {},
			layer: '1',
			content: {}
		},
		{
			id: 'obj1',
			enable: {},
			layer: '1',
			content: {}
		}
	]
	test('validateObject', () => {
		expect(() => {
			validateObject(obj, true)
		}).not.toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.id
			validateObject(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(obj)
			delete o.enable
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
	})
	test('validateKeyframe', () => {
		expect(() => {
			validateKeyframe(keyframe, true)
		}).not.toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.id
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.enable
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			validateKeyframe(o, true)
		}).toThrowError()

		expect(() => {
			const o = _.clone(keyframe)
			delete o.content
			validateKeyframe(o, true)
		}).toThrowError()
	})
	test('validateTimeline', () => {
		expect(() => {
			const tl = _.clone(timeline)
			tl[1].id = tl[0].id
			validateTimeline(tl, false)
		}).toThrowError()
	})
})
