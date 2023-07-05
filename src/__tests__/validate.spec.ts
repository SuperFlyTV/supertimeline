import {
	validateObject,
	validateKeyframe,
	validateTimeline,
	validateIdString,
	TimelineObject,
	TimelineEnable,
	TimelineKeyframe,
} from '..'
import { clone } from '../resolver/lib/lib'

describe('validate', () => {
	const obj: TimelineObject = {
		id: 'obj0',
		enable: {
			start: 10,
		},
		layer: '1',
		content: {},
	}
	const keyframe: TimelineKeyframe = {
		id: 'kf0',
		enable: {
			start: 10,
			end: 14,
		},
		content: {},
	}
	const timeline: TimelineObject[] = [
		{
			id: 'obj1',
			enable: {
				start: 1000,
			},
			layer: '1',
			content: {},
		},
		{
			id: 'obj2',
			enable: {
				while: 1,
			},
			layer: '1',
			content: {},
		},
	]
	test('validateObject', () => {
		expect(() => {
			validateObject(obj, true)
		}).not.toThrow()

		expect(() => {
			// @ts-ignore
			validateObject(undefined, true)
		}).toThrow()
		expect(() => {
			// @ts-ignore
			validateObject(1337, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-expect-error
			delete o.id
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-ignore
			o.id = 1337
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-expect-error
			delete o.enable
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.enable = clone(o.enable) as TimelineEnable
			o.enable.while = 32
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.enable = [o.enable as TimelineEnable]
			validateObject(o, true)
		}).not.toThrow()

		expect(() => {
			const o = clone(obj)
			o.enable = {
				start: 10,
				end: 32,
				duration: 22,
			}
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.enable = {
				while: 1,
				end: 32,
			}
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.enable = {
				while: 1,
				duration: 10,
			}
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-expect-error
			delete o.layer
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-expect-error
			delete o.content
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-ignore
			o.classes = ['123', 124]
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-ignore
			o.priority = '2'
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.children = clone(timeline)
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.children = clone(timeline)
			o.isGroup = true
			validateObject(o, true)
		}).not.toThrow()

		expect(() => {
			const o = clone(obj)
			o.children = [clone(timeline[0]), clone(timeline[1])]
			o.isGroup = true
			// @ts-ignore
			o.children[0].id = 123
			validateObject(o, true)
		}).toThrow()
	})
	test('validateKeyframe', () => {
		expect(() => {
			validateKeyframe(keyframe, true)
		}).not.toThrow()

		expect(() => {
			// @ts-ignore
			validateKeyframe(undefined, true)
		}).toThrow()

		expect(() => {
			// @ts-ignore
			validateKeyframe('abc', true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			// @ts-expect-error
			delete o.id
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			// @ts-ignore
			o.id = 12
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			// @ts-expect-error
			delete o.enable
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = clone(o.enable) as TimelineEnable
			o.enable.while = 32
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = {
				start: 10,
				end: 32,
				duration: 22,
			}
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = [
				{
					start: 10,
					end: 32,
					duration: 22,
				},
			]
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = {
				while: 1,
				end: 32,
			}
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = {
				while: 1,
				duration: 10,
			}
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			o.enable = clone(o.enable) as TimelineEnable
			delete o.enable.start
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			// @ts-expect-error
			delete o.content
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(keyframe)
			// @ts-ignore
			o.classes = ['123', 124]
			validateKeyframe(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.keyframes = [clone(keyframe)]
			validateObject(o, true)
		}).not.toThrow()

		expect(() => {
			const o = clone(obj)
			o.keyframes = [clone(keyframe)]
			// @ts-ignore
			o.keyframes[0].id = 13
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			o.keyframes = [clone(keyframe)]
			// @ts-ignore
			o.keyframes[0].id = obj.id
			validateObject(o, true)
		}).toThrow()

		expect(() => {
			const o = clone(obj)
			// @ts-ignore
			o.classes = [123]
			validateObject(o, true)
		}).toThrow()
	})
	test('validateTimeline', () => {
		expect(() => {
			const tl = clone(timeline)
			validateTimeline(tl, false)
		}).not.toThrow()

		expect(() => {
			const tl = clone(timeline)
			tl[1].id = tl[0].id
			validateTimeline(tl, false)
		}).toThrow()
	})
	test('validateIdString', () => {
		expect(() => validateIdString('')).not.toThrow()
		expect(() => validateIdString('test')).not.toThrow()
		expect(() => validateIdString('abcABC123_')).not.toThrow()
		expect(() => validateIdString('_¤"\'£€\\,;:¨~')).not.toThrow()

		expect(() => validateIdString('test-1')).toThrow()
		expect(() => validateIdString('test+1')).toThrow()
		expect(() => validateIdString('test/1')).toThrow()
		expect(() => validateIdString('test*1')).toThrow()
		expect(() => validateIdString('test%1')).toThrow()
		expect(() => validateIdString('test&1')).toThrow()
		expect(() => validateIdString('test|1')).toThrow()
		expect(() => validateIdString('test!')).toThrow()
		expect(() => validateIdString('test(')).toThrow()
		expect(() => validateIdString('test)')).toThrow()
		expect(() => validateIdString('#test')).toThrow() // a reference to an object id
		expect(() => validateIdString('.test')).toThrow() // a reference to an object class
		expect(() => validateIdString('$test')).toThrow() // a reference to an object layer

		// These aren't currently in use anywhere, but might be so in the future:
		expect(() => validateIdString('test§', true)).toThrow()
		expect(() => validateIdString('test^', true)).toThrow()
		expect(() => validateIdString('test?', true)).toThrow()
		expect(() => validateIdString('test=', true)).toThrow()
		expect(() => validateIdString('test{', true)).toThrow()
		expect(() => validateIdString('test}', true)).toThrow()
		expect(() => validateIdString('test[', true)).toThrow()
		expect(() => validateIdString('test]', true)).toThrow()
	})
	test('invalid id-strings', () => {
		expect(() => {
			const tl = clone(timeline)
			tl[0] = clone(tl[0])
			tl[0].id = 'obj-1'
			validateTimeline(tl, false)
		}).toThrow(/id/)

		expect(() => {
			const tl = clone(timeline)
			tl[0] = clone(tl[0])

			tl[0].classes = ['class-1']
			validateTimeline(tl, false)
		}).toThrow(/class/)
		expect(() => {
			const tl = clone(timeline)
			tl[0] = clone(tl[0])

			tl[0].layer = 'layer-1'
			validateTimeline(tl, false)
		}).toThrow(/layer/)
	})
})
