import * as _ from 'underscore'
import { TimelineObject, EventType, Resolver } from '../../..'

describe('Resolver, basic', () => {
	beforeEach(() => {
		// resetId()
	})
	test('simple timeline', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 100,
				},
				content: {},
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 10', // 10
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10', // 30
					duration: 15,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0 }))

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.objects['video'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 0, end: 100 }],
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 20 }],
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 30, end: 45 }],
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.time).toEqual(5)
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video',
			},
		})
		expect(state0.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 15)).toMatchObject({
			layers: {
				'0': {
					id: 'video',
				},
				'1': {
					id: 'graphic0',
				},
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.END,
					objId: 'graphic0',
				},
				{
					time: 30,
					type: EventType.START,
					objId: 'graphic1',
				},
				{
					time: 45,
					type: EventType.END,
					objId: 'graphic1',
				},
				{
					time: 100,
					type: EventType.END,
					objId: 'video',
				},
			],
		})
		const state1 = Resolver.getState(resolved, 21)
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video',
			},
		})
		expect(state1.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 31).layers).toMatchObject({
			'0': {
				id: 'video',
			},
			'1': {
				id: 'graphic1',
			},
		})
		const state2 = Resolver.getState(resolved, 46)
		expect(state2.layers).toMatchObject({
			'0': {
				id: 'video',
			},
		})
		expect(state2.layers['1']).toBeFalsy()
	})
	test('repeating object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 40,
					repeating: 50,
				},
				content: {},
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 20', // 20
					duration: 19, // 39
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 145 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['video'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 40 },
				{ start: 50, end: 90 },
				{ start: 100, end: 140 },
			],
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 20, end: 39 },
				{ start: 70, end: 89 },
				{ start: 120, end: 139 },
			],
		})
		const state0 = Resolver.getState(resolved, 15)
		expect(state0.layers['1']).toBeFalsy()
		expect(state0).toMatchObject({
			layers: {
				'0': {
					id: 'video',
				},
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.START,
					objId: 'graphic0',
				},
				{
					time: 39,
					type: EventType.END,
					objId: 'graphic0',
				},
				{
					time: 40,
					type: EventType.END,
					objId: 'video',
				},
				// next repeat:
				{
					time: 50,
					type: EventType.START,
					objId: 'video',
				},
				{
					time: 70,
					type: EventType.START,
					objId: 'graphic0',
				},
				{
					time: 89,
					type: EventType.END,
					objId: 'graphic0',
				},
				{
					time: 90,
					type: EventType.END,
					objId: 'video',
				},

				{
					time: 100,
					type: EventType.START,
					objId: 'video',
				},
				{
					time: 120,
					type: EventType.START,
					objId: 'graphic0',
				},
				{
					time: 139,
					type: EventType.END,
					objId: 'graphic0',
				},
				{
					time: 140,
					type: EventType.END,
					objId: 'video',
				},
			],
		})

		expect(Resolver.getState(resolved, 21).layers).toMatchObject({
			'0': {
				id: 'video',
			},
			'1': {
				id: 'graphic0',
			},
		})
		const state1 = Resolver.getState(resolved, 39)
		expect(state1.layers['1']).toBeFalsy()
		expect(state1).toMatchObject({
			layers: {
				'0': {
					id: 'video',
				},
			},
		})

		expect(Resolver.getState(resolved, 51).layers).toMatchObject({
			'0': {
				id: 'video',
			},
		})

		expect(Resolver.getState(resolved, 72).layers).toMatchObject({
			'0': {
				id: 'video',
			},
			'1': {
				id: 'graphic0',
			},
		})
	})
	test('classes', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					end: 10,
					repeating: 50,
				},
				content: {},
				classes: ['class0'],
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: '#video0.end + 15', // 25
					duration: 10,
					repeating: 50,
				},
				content: {},
				classes: ['class0', 'class1'],
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					while: '.class0',
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '2',
				enable: {
					while: '.class1 + 1',
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0, limitTime: 100 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()

		expect(resolved.objects['video0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 10 },
				{ start: 50, end: 60 },
			],
		})
		expect(resolved.objects['video1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 25, end: 35 },
				{ start: 75, end: 85 },
			],
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 10 },
				{ start: 25, end: 35 },
				{ start: 50, end: 60 },
				{ start: 75, end: 85 },
			],
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 26, end: 36 },
				{ start: 76, end: 86 },
			],
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.layers['2']).toBeFalsy()
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video0',
			},
			'1': {
				id: 'graphic0',
			},
		})
		const state1 = Resolver.getState(resolved, 25)
		expect(state1.layers['2']).toBeFalsy()
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video1',
			},
			'1': {
				id: 'graphic0',
			},
		})
		expect(Resolver.getState(resolved, 26).layers).toMatchObject({
			'0': {
				id: 'video1',
			},
			'1': {
				id: 'graphic0',
			},
			'2': {
				id: 'graphic1',
			},
		})

		expect(Resolver.getState(resolved, 76).layers).toMatchObject({
			'0': {
				id: 'video1',
			},
			'1': {
				id: 'graphic0',
			},
			'2': {
				id: 'graphic1',
			},
		})
	})
	test('Unique instance ids', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 10,
					duration: 80,
				},
				content: {},
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: 10,
					duration: 20,
				},
				content: {},
				priority: 1,
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()

		const instanceIds: { [id: string]: true } = {}
		_.each(resolved.objects, (obj) => {
			_.each(obj.resolved.instances, (instance) => {
				expect(instanceIds[instance.id]).toBeFalsy()
				instanceIds[instance.id] = true
			})
		})

		expect(_.keys(instanceIds)).toHaveLength(3)
	})
	test('Repeating many', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8,
					repeating: 10,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(100)
	})
	test('Repeating interrupted', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: '0',
				enable: {
					start: 0,
					duration: 5,
					repeating: 10,
				},
				content: {},
			},
			{
				id: 'obj1',
				layer: '0',
				enable: {
					start: 22,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 5 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['obj1'].resolved.instances).toMatchObject([
			{ start: 22, end: 30 },
			{ start: 35, end: 40 },
			{ start: 45, end: null },
		])
		expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
			{ start: 0, end: 5 },
			{ start: 10, end: 15 },
			{ start: 20, end: 22 },
			{ start: 30, end: 35 },
			{ start: 40, end: 45 },
		])
	})
	test('Repeating interrupted by higher prio', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: '0',
				enable: {
					start: 0,
					duration: 5,
					repeating: 10,
				},
				content: {},
			},
			{
				id: 'obj1',
				layer: '0',
				enable: {
					start: 22,
				},
				content: {},
				priority: 1,
			},
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 5 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['obj1'].resolved.instances).toMatchObject([{ start: 22, end: null }])
		expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
			{ start: 0, end: 5 },
			{ start: 10, end: 15 },
			{ start: 20, end: 22 },
		])
	})
	test('Class not defined', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				priority: 0,
				enable: {
					while: '!.class0',
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy() // TODO - is this one correct?
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

		const state = Resolver.getState(resolved, 10, 10)
		expect(state.layers['0']).toBeTruthy()
		expect(state.layers['0'].id).toEqual('video0')
	})
	test('Reference duration', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				priority: 0,
				enable: {
					start: 10,
					end: 100,
				},
				content: {},
			},
			{
				id: 'video1',
				layer: '1',
				priority: 0,
				enable: {
					start: 20,
					duration: '#video0',
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['video1'].resolved.instances).toMatchObject([
			{
				start: 20,
				end: 110,
			},
		])
	})
	test('Reference own layer', () => {
		// https://github.com/SuperFlyTV/supertimeline/pull/50
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8,
				},
				content: {},
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end',
					duration: 2,
				},
				content: {},
			},
			{
				id: 'video2',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end + 1',
					duration: 2,
				},
				content: {},
			},
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 })
			)

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([
				{
					start: 0,
					end: 8,
				},
			])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([
				{
					start: 8,
					end: 9, // becuse it's overridden by video2
					originalEnd: 10,
				},
			])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([
				{
					start: 9,
					end: 11,
				},
			])
		}
	})
	test('Reference own class', () => {
		// https://github.com/SuperFlyTV/supertimeline/pull/50
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8,
				},
				content: {},
				classes: ['insert_after'],
			},
			{
				id: 'video1',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end',
					duration: 2,
				},
				content: {},
				classes: ['insert_after'],
			},
			{
				id: 'video2',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end + 1',
					duration: 2,
				},
				content: {},
				classes: ['insert_after'],
			},
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 })
			)

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([
				{
					start: 0,
					end: 8,
				},
			])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([
				{
					start: 8,
					end: 9, // becuse it's overridden by video2
					originalEnd: 10,
				},
			])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([
				{
					start: 9,
					end: 11,
				},
			])
		}
	})
	test('References', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'a',
				layer: 'a',
				priority: 0,
				enable: {
					start: '100', // 100
					duration: 100, // 200
				},
				content: {},
				classes: ['a'],
			},
			{
				id: 'b',
				layer: 'b',
				priority: 0,
				enable: {
					start: '150', // 200
					duration: 100, // 300
				},
				content: {},
				classes: ['b'],
			},
			{
				id: 'test0',
				layer: 'test0',
				priority: 0,
				enable: {
					while: '.a & !.b',
				},
				content: {},
			},
		]
		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 })
		const resolved = Resolver.resolveAllStates(resolved0)

		expect(resolved.objects['test0'].resolved.instances).toMatchObject([{ start: 100, end: 150 }])
	})
	test('Continuous combined negated and normal classes on different objects', () => {
		// https://github.com/SuperFlyTV/supertimeline/pull/57
		const timeline: TimelineObject[] = [
			{
				id: 'parent',
				layer: 'p0',
				priority: 0,
				enable: {
					while: 1,
				},
				content: {
					val: 1,
				},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							while: '.playout & !.muted',
						},
						content: {
							val: 2,
						},
					},
				],
			},

			{
				id: 'muted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '100',
					duration: 100,
				},
				content: {},
				classes: ['playout', 'muted'],
			},
			{
				id: 'muted_playout2',
				layer: '2',
				priority: 0,
				enable: {
					start: '200',
					duration: 100,
				},
				content: {},
				classes: ['playout', 'muted'],
			},
			{
				id: 'unmuted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '300',
					duration: 100,
				},
				content: {},
				classes: ['playout'],
			},
		]
		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 })
		const resolved = Resolver.resolveAllStates(resolved0)

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)

		expect(resolved.objects['parent'].resolved.instances).toMatchObject([{ start: 0, end: null }])
		expect(resolved.objects['muted_playout1'].resolved.instances).toMatchObject([{ start: 100, end: 200 }])
		expect(resolved.objects['muted_playout2'].resolved.instances).toMatchObject([{ start: 200, end: 300 }])
		expect(resolved.objects['unmuted_playout1'].resolved.instances).toMatchObject([{ start: 300, end: 400 }])

		expect(resolved.objects['kf0'].resolved.instances).toMatchObject([{ start: 300, end: 400 }])

		// first everything is normal
		expect(Resolver.getState(resolved, 50).layers).toMatchObject({
			p0: {
				content: { val: 1 },
			},
		})

		// then we have muted playout
		expect(Resolver.getState(resolved, 150).layers).toMatchObject({
			p0: {
				content: { val: 1 },
			},
			'2': { id: 'muted_playout1' },
		})

		// then we have muted playout again
		expect(Resolver.getState(resolved, 250).layers).toMatchObject({
			p0: {
				content: { val: 1 },
			},
			'2': { id: 'muted_playout2' },
		})

		// only then we have unmuted playout
		expect(Resolver.getState(resolved, 350).layers).toMatchObject({
			p0: {
				content: { val: 2 },
			},
			'2': { id: 'unmuted_playout1' },
		})
	})
	test('zero length object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: 'L1',
				enable: {
					start: 10,
					end: '#obj1.start', // turns this into a zero-duration
				},
				content: {},
			},
			{
				id: 'obj1',
				layer: 'L2',
				enable: {
					start: 10,
				},
				content: {},
			},
			{
				id: 'obj2',
				layer: 'L3',
				enable: {
					start: '#obj0.start', // 10
					duration: 10, // 20
				},
				content: {},
			},
		]
		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

		expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
			{
				start: 10,
				end: 10,
			},
		])
		expect(resolved.objects['obj2'].resolved.instances).toMatchObject([
			{
				start: 10,
				end: 20,
			},
		])

		const state = Resolver.getState(resolved, 15)
		expect(state.layers.L1).toBeUndefined()
		expect(state.layers.L2).toMatchObject({ id: 'obj1' })
		expect(state.layers.L3).toMatchObject({ id: 'obj2' })
	})
	test('zero length object sandwich', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: 'L1',
				enable: {
					start: 10,
					end: '#obj1.start',
				},
				content: {},
			},
			{
				id: 'obj1',
				layer: 'L2',
				enable: {
					start: 10,
					end: '#obj2.start',
				},
				content: {},
			},
			{
				id: 'obj2',
				layer: 'L3',
				enable: {
					start: 10,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
		const state = Resolver.getState(resolved, 20)
		expect(state.layers.L3).toMatchObject({ id: 'obj2' })
		expect(state.layers.L2).toBeUndefined()
		expect(state.layers.L1).toBeUndefined()
	})
	test('negative length object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: 'L1',
				enable: {
					start: 15,
					end: 10,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
		expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
			{
				start: 15,
				end: 10,
			},
		])
		const state0 = Resolver.getState(resolved, 14)
		expect(state0.layers.L1).toBeUndefined()

		const state1 = Resolver.getState(resolved, 15)
		expect(state1.layers.L1).toBeUndefined()
	})
	// This test is "temporarily" disabled,
	// see https://github.com/SuperFlyTV/supertimeline/pull/60
	// test('negative length object sandwich', () => {
	// 	const timeline: TimelineObject[] = [
	// 		{
	// 			id: 'obj0',
	// 			layer: 'L1',
	// 			enable: {
	// 			  start: 15,
	// 			  end: '#obj1.start' // 15
	// 			},
	// 			content: {}
	// 		},
	// 		{
	// 			id: 'obj1',
	// 			layer: 'L2',
	// 			enable: {
	// 			  start: 15,
	// 			  end: '#obj2.start' // 10
	// 			},
	// 			content: {}
	// 		},
	// 		{
	// 			id: 'obj2',
	// 			layer: 'L3',
	// 			enable: {
	// 			  start: 10
	// 			},
	// 			content: {}
	// 		},
	// 		{
	// 			id: 'obj3',
	// 			layer: 'L4',
	// 			enable: {
	// 			  start: '#obj1.start', // 10
	// 			  duration: 10
	// 			},
	// 			content: {}
	// 		},
	// 		{
	// 			id: 'obj4',
	// 			layer: 'L5',
	// 			enable: {
	// 			  start: '#obj1.end', // 15
	// 			  duration: 10
	// 			},
	// 			content: {}
	// 		}
	// 	]

	// 	const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
	// 	expect(resolved.objects['obj1'].resolved.instances).toMatchObject([{
	// 		start: 15,
	// 		end: 10
	// 	}])
	// 	expect(resolved.objects['obj3'].resolved.instances).toMatchObject([{
	// 		start: 10,
	// 		end: 20
	// 	}])
	// 	expect(resolved.objects['obj4'].resolved.instances).toMatchObject([{
	// 		start: 15,
	// 		end: 25
	// 	}])
	// 	const state = Resolver.getState(resolved, 20)
	// 	expect(state.layers.L1).toBeUndefined()
	// 	expect(state.layers.L2).toBeUndefined()
	// 	expect(state.layers.L3).toMatchObject({ id: 'obj2' })
	// 	expect(state.layers.L4).toMatchObject({ id: 'obj3' })
	// 	expect(state.layers.L5).toMatchObject({ id: 'obj4' })
	// })
	test('negative length object sandwich 2', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: 'L1',
				enable: {
					start: 10,
					end: '#obj1.start',
				},
				content: {},
			},
			{
				id: 'obj1',
				layer: 'L2',
				enable: {
					start: 20,
					end: '#obj2.start',
				},
				content: {},
			},
			{
				id: 'obj2',
				layer: 'L3',
				enable: {
					start: 30,
					duration: 10,
				},
				content: {},
			},
		]

		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0 })
		expect(resolved0.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
		expect(resolved0.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 30 }])
		expect(resolved0.objects['obj2'].resolved.instances).toMatchObject([{ start: 30, end: 40 }])

		// Move obj2, so that obj1 becomes zero-length
		// @ts-ignore
		timeline[2].enable.start = 20

		const resolved1 = Resolver.resolveTimeline(timeline, { time: 0 })
		expect(resolved1.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
		expect(resolved1.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 20 }])
		expect(resolved1.objects['obj2'].resolved.instances).toMatchObject([{ start: 20, end: 30 }])

		// Move obj2, so that obj1 becomes negative-length
		// @ts-ignore
		timeline[2].enable.start = 15

		const resolved2 = Resolver.resolveTimeline(timeline, { time: 0 })
		expect(resolved2.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
		expect(resolved2.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 15 }])
		expect(resolved2.objects['obj2'].resolved.instances).toMatchObject([{ start: 15, end: 25 }])

		const state2 = Resolver.getState(resolved2, 17)
		expect(state2.layers.L1).toMatchObject({ id: 'obj0' })
		expect(state2.layers.L2).toBeUndefined()
		expect(state2.layers.L3).toMatchObject({ id: 'obj2' })
	})

	test('instances from end boundary', () => {
		const boundary = 20
		const timeline: TimelineObject[] = [
			{
				id: 'enable0',
				priority: 0,
				enable: {
					start: 10,
				},
				layer: 'run_helper',
				classes: ['class0'],
				content: {},
			},
			{
				id: 'enable1',
				priority: 0,
				enable: {
					start: boundary,
				},
				layer: 'run_helper',
				classes: ['class0'],
				content: {},
			},
			{
				id: 'obj0',
				enable: {
					while: '.class0',
				},
				priority: 1,
				layer: 'layer0',
				content: {},
				seamless: true,
			},
		]
		{
			const resolved0 = Resolver.resolveTimeline(timeline, { time: boundary + 50 })
			const allStates0 = Resolver.resolveAllStates(resolved0)
			const state0 = Resolver.getState(allStates0, boundary + 50)
			expect(state0.layers['layer0'].resolved.instances).toMatchObject([
				{ start: 10, end: null, originalStart: 10 },
			])
			expect(state0.layers['layer0'].instance).toMatchObject(state0.layers['layer0'].resolved.instances[0])

			const state1 = Resolver.getState(resolved0, boundary + 50)
			expect(state1.layers['layer0'].resolved.instances).toMatchObject([
				{ start: 10, end: null, originalStart: 10 },
			])
		}

		// Also check when setting an end time:
		// @ts-ignore
		timeline[0].enable.end = boundary

		{
			const resolved0 = Resolver.resolveTimeline(timeline, { time: boundary - 50 })
			const allStates0 = Resolver.resolveAllStates(resolved0)
			const state0 = Resolver.getState(allStates0, boundary + 50)
			expect(state0.layers['layer0'].resolved.instances).toMatchObject([
				{ start: 10, end: null, originalStart: 10 },
			])
			expect(state0.layers['layer0'].instance).toMatchObject(state0.layers['layer0'].resolved.instances[0])

			const state1 = Resolver.getState(resolved0, boundary + 50)
			expect(state1.layers['layer0'].resolved.instances).toMatchObject([
				{ start: 10, end: null, originalStart: 10 },
			])
		}
	})
	test('seamless', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				enable: [
					{ start: 10, end: 20 },
					{ start: 20, end: 30 },

					{ start: 40, end: 50 },
					{ start: 50, end: 50 },
					{ start: 50, end: 51 },

					{ start: 60, end: 60 },
					{ start: 60 },
				],
				layer: 'L0',
				content: {},
				seamless: false,
			},
		]
		{
			const resolved0 = Resolver.resolveTimeline(timeline, { time: 0 })
			const allStates0 = Resolver.resolveAllStates(resolved0)
			expect(allStates0.objects['obj0'].resolved.instances).toMatchObject([
				{ start: 10, end: 20, originalStart: 10 },
				{ start: 20, end: 30, originalStart: 20 },
				{ start: 40, end: 50, originalStart: 40 },
				{ start: 50, end: 51, originalStart: 50 },
				{ start: 60, end: null, originalStart: 60 },
			])
		}
		// Now check when seamless is enabled:
		timeline[0].seamless = true
		{
			const resolved0 = Resolver.resolveTimeline(timeline, { time: 0 })
			const allStates0 = Resolver.resolveAllStates(resolved0)
			expect(allStates0.objects['obj0'].resolved.instances).toMatchObject([
				{ start: 10, end: 30, originalStart: 10 },
				{ start: 40, end: 51, originalStart: 40 },
				{ start: 60, end: null, originalStart: 60 },
			])
		}
	})
})
