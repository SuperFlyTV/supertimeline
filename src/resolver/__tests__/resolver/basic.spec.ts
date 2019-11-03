import * as _ from 'underscore'
import {
	TimelineObject,
	EventType,
	Resolver
} from '../../..'

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
					end: 100
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 10', // 10
					duration: 10
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10', // 30
					duration: 15
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0 })
		)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.objects['video'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 0, end: 100 }]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 20 }]
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 30, end: 45 }]
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.time).toEqual(5)
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})
		expect(state0.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 15)).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				},
				'1': {
					id: 'graphic0'
				}
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 30,
					type: EventType.START,
					objId: 'graphic1'
				},
				{
					time: 45,
					type: EventType.END,
					objId: 'graphic1'
				},
				{
					time: 100,
					type: EventType.END,
					objId: 'video'
				}
			]
		})
		const state1 = Resolver.getState(resolved, 21)
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})
		expect(state1.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 31).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic1'
			}
		})
		const state2 = Resolver.getState(resolved, 46)
		expect(state2.layers).toMatchObject({
			'0': {
				id: 'video'
			}
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
					repeating: 50
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 20', // 20
					duration: 19 // 39
				},
				content: {}
			}
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
				{ start: 100, end: 140 }
			]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 20, end: 39 },
				{ start: 70, end: 89 },
				{ start: 120, end: 139 }
			]
		})
		const state0 = Resolver.getState(resolved, 15)
		expect(state0.layers['1']).toBeFalsy()
		expect(state0).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				}
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 39,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 40,
					type: EventType.END,
					objId: 'video'
				},
				// next repeat:
				{
					time: 50,
					type: EventType.START,
					objId: 'video'
				},
				{
					time: 70,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 89,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 90,
					type: EventType.END,
					objId: 'video'
				},

				{
					time: 100,
					type: EventType.START,
					objId: 'video'
				},
				{
					time: 120,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 139,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 140,
					type: EventType.END,
					objId: 'video'
				}
			]
		})

		expect(Resolver.getState(resolved, 21).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic0'
			}
		})
		const state1 = Resolver.getState(resolved, 39)
		expect(state1.layers['1']).toBeFalsy()
		expect(state1).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				}
			}
		})

		expect(Resolver.getState(resolved, 51).layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})

		expect(Resolver.getState(resolved, 72).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic0'
			}
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
					repeating: 50
				},
				content: {},
				classes: ['class0']
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: '#video0.end + 15', // 25
					duration: 10,
					repeating: 50
				},
				content: {},
				classes: ['class0', 'class1']
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					while: '.class0'
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '2',
				enable: {
					while: '.class1 + 1'
				},
				content: {}
			}
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
				{ start: 50, end: 60 }
			]
		})
		expect(resolved.objects['video1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 25, end: 35 },
				{ start: 75, end: 85 }
			]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 10 },
				{ start: 25, end: 35 },
				{ start: 50, end: 60 },
				{ start: 75, end: 85 }
			]
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 26, end: 36 },
				{ start: 76, end: 86 }
			]
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.layers['2']).toBeFalsy()
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video0'
			},
			'1': {
				id: 'graphic0'
			}
		})
		const state1 = Resolver.getState(resolved, 25)
		expect(state1.layers['2']).toBeFalsy()
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			}
		})
		expect(Resolver.getState(resolved, 26).layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			},
			'2': {
				id: 'graphic1'
			}
		})

		expect(Resolver.getState(resolved, 76).layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			},
			'2': {
				id: 'graphic1'
			}
		})
	})
	test('Unique instance ids', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 10,
					duration: 80
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: 10,
					duration: 20
				},
				content: {},
				priority: 1
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()

		const instanceIds: {[id: string]: true} = {}
		_.each(resolved.objects, (obj) => {
			_.each(obj.resolved.instances, instance => {
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
					repeating: 10
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(100)
	})
	test('Class not defined', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				priority: 0,
				enable: {
					while: '!.class0'
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

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
					end: 100
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '1',
				priority: 0,
				enable: {
					start: 20,
					duration: '#video0'
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['video1'].resolved.instances).toMatchObject([
			{
				start: 20,
				end: 110
			}
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
					duration: 8
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end',
					duration: 2
				},
				content: {}
			},
			{
				id: 'video2',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end + 1',
					duration: 2
				},
				content: {}
			}
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([{
				start: 0,
				end: 8
			}])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([{
				start: 8,
				end: 9, // becuse it's overridden by video2
				originalEnd: 10
			}])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([{
				start: 9,
				end: 11
			}])
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
					duration: 8
				},
				content: {},
				classes: [ 'insert_after' ]
			},
			{
				id: 'video1',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end',
					duration: 2
				},
				content: {},
				classes: [ 'insert_after' ]
			},
			{
				id: 'video2',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end + 1',
					duration: 2
				},
				content: {},
				classes: [ 'insert_after' ]
			}
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([{
				start: 0,
				end: 8
			}])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([{
				start: 8,
				end: 9, // becuse it's overridden by video2
				originalEnd: 10
			}])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([{
				start: 9,
				end: 11
			}])
		}
	})
	test('Continuous combined negated and normal classes on different objects', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'parent',
				layer: 'p0',
				priority: 0,
				enable: {
					while: 1
				},
				content: {
					val: 1
				},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							while: '.playout & !.muted'
						},
						content: {
							val: 2
						}
					}
				]
			},

			{
				id: 'muted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '100',
					duration: 100
				},
				content: {},
				classes: [ 'playout', 'muted' ]
			},
			{
				id: 'muted_playout2',
				layer: '2',
				priority: 0,
				enable: {
					start: '200',
					duration: 100
				},
				content: {},
				classes: [ 'playout', 'muted' ]
			},
			{
				id: 'unmuted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '300',
					duration: 100
				},
				content: {},
				classes: [ 'playout' ]
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)

		// first everything is normal
		expect(Resolver.getState(resolved, 50).layers['p0'].content).toMatchObject({
			val: 1
		})

		// then we have muted playout
		expect(Resolver.getState(resolved, 150).layers['p0'].content).toMatchObject({
			val: 1
		})

		// then we have muted playout again
		expect(Resolver.getState(resolved, 250).layers['p0'].content).toMatchObject({
			val: 1
		})

		// only then we have unmuted playout
		expect(Resolver.getState(resolved, 350).layers['p0'].content).toMatchObject({
			val: 2
		})

	})
})
