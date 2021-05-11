import * as _ from 'underscore'
import { TimelineObject, EventType, Resolver, TimelineObjectInstance } from '../../..'

describe('Resolver, groups', () => {
	beforeEach(() => {
		// resetId()
	})
	test('simple group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group',
				layer: '0',
				enable: {
					start: 10,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5', // 15
							duration: 10, // 25
						},
						content: {},
					},
					{
						id: 'child1',
						layer: '1',
						enable: {
							start: '#child0.end', // 25
							duration: 10, // 35
						},
						content: {},
					},
					{
						id: 'child2',
						layer: '2',
						enable: {
							start: '-1', // 9, will be capped in parent
							end: 150, // 160, will be capped in parent
						},
						content: {},
					},
				],
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
		// console.log(JSON.stringify(resolved, null, 3))
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.resolvedGroupCount).toEqual(1)

		expect(resolved.objects['group']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 25 }],
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 25, end: 35 }],
		})
		expect(resolved.objects['child2'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 100 }],
		})

		const state0 = Resolver.getState(resolved, 11)
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'group',
			},
		})
		expect(state0.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 15)).toMatchObject({
			layers: {
				'0': {
					id: 'group',
				},
				'1': {
					id: 'child0',
				},
				'2': {
					id: 'child2',
				},
			},
		})
		expect(Resolver.getState(resolved, 30)).toMatchObject({
			layers: {
				'0': {
					id: 'group',
				},
				'1': {
					id: 'child1',
				},
			},
		})
	})
	test('etheral groups', () => {
		// "etheral groups" are groups without a layer
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: '',
				enable: {
					start: 10,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5', // 15
						},
						content: {},
					},
				],
			},
			{
				id: 'group1',
				layer: '',
				enable: {
					start: 50,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '5', // 55
						},
						content: {},
					},
				],
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['group1']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 100 }],
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 100 }],
		})
		expect(resolved.objects['group1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 50, end: 100 }],
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 55, end: 100 }],
		})

		expect(Resolver.getState(resolved, 16).layers).toMatchObject({
			'1': {
				id: 'child0',
			},
		})
		expect(Resolver.getState(resolved, 56)).toMatchObject({
			layers: {
				'1': {
					id: 'child0',
				},
				'2': {
					id: 'child1',
				},
			},
			nextEvents: [
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
			],
		})

		// objects should be capped inside their parent:
		const state0 = Resolver.getState(resolved, 120)
		expect(state0.layers['1']).toBeFalsy()
		expect(state0.layers['2']).toBeFalsy()
	})
	test('solid groups', () => {
		// "solid groups" are groups with a layer
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 10,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5', // 15
						},
						content: {},
					},
				],
			},
			{
				id: 'group1',
				layer: 'g0',
				enable: {
					start: 50,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '5', // 55
						},
						content: {},
					},
				],
			},
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['group1']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 50 }], // because group 1 started
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 100 }],
		})
		expect(resolved.objects['group1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 50, end: 100 }],
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 55, end: 100 }],
		})

		expect(Resolver.getState(resolved, 16)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'1': {
					id: 'child0',
				},
			},
			nextEvents: [
				{ objId: 'group0', time: 50, type: EventType.END },
				{ objId: 'group1', time: 50, type: EventType.START },
				{ objId: 'child1', time: 55, type: EventType.START },
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group1', time: 100, type: EventType.END },
			],
		})
		expect(Resolver.getState(resolved, 56)).toMatchObject({
			layers: {
				g0: {
					id: 'group1',
				},
				'2': {
					id: 'child1',
				},
			},
			nextEvents: [
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group1', time: 100, type: EventType.END },
			],
		})
		const state1 = Resolver.getState(resolved, 120)
		expect(state1.layers['g0']).toBeFalsy()
		expect(state1.layers['1']).toBeFalsy()
		expect(state1.layers['2']).toBeFalsy()
	})
	test('solid groups - non alphabetical', () => {
		// "solid groups" are groups with a layer
		const timeline: TimelineObject[] = [
			{
				id: 'group1',
				layer: 'g0',
				enable: {
					start: 10,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5', // 15
						},
						content: {},
					},
				],
			},
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 50,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '5', // 55
						},
						content: {},
					},
				],
			},
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group1']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 50 }], // because group 1 started
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 100 }],
		})
		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 50, end: 100 }],
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 55, end: 100 }],
		})

		expect(Resolver.getState(resolved, 16)).toMatchObject({
			layers: {
				g0: {
					id: 'group1',
				},
				'1': {
					id: 'child0',
				},
			},
			nextEvents: [
				{ objId: 'group1', time: 50, type: EventType.END },
				{ objId: 'group0', time: 50, type: EventType.START },
				{ objId: 'child1', time: 55, type: EventType.START },
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group0', time: 100, type: EventType.END },
			],
		})
		expect(Resolver.getState(resolved, 56)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'2': {
					id: 'child1',
				},
			},
			nextEvents: [
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group0', time: 100, type: EventType.END },
			],
		})
		const state1 = Resolver.getState(resolved, 120)
		expect(state1.layers['g0']).toBeFalsy()
		expect(state1.layers['1']).toBeFalsy()
		expect(state1.layers['2']).toBeFalsy()
	})
	test('cap in repeating parent group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 0, // 0, 100
					duration: 80, // 80, 180
					repeating: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '50', // 50, 150
							duration: 20, // 70, 170
						},
						content: {},
					},
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '#child0.end', // 70, 170
							duration: 50, // 120 (to be capped at 100), 220 (to be capped at 200)
						},
						content: {},
					},
				],
			},
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 80 },
				{ start: 100, end: 180 },
			],
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 50, end: 70 },
				{ start: 150, end: 170 },
			],
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 70, end: 80 },
				{ start: 170, end: 180 },
			],
		})
		expect(Resolver.getState(resolved, 10)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
			},
		})
		expect(Resolver.getState(resolved, 55)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'1': {
					id: 'child0',
				},
			},
		})
		expect(Resolver.getState(resolved, 78)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'2': {
					id: 'child1',
				},
			},
		})
		expect(Resolver.getState(resolved, 85).layers).toEqual({})

		expect(Resolver.getState(resolved, 110)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
			},
		})
		expect(Resolver.getState(resolved, 155)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'1': {
					id: 'child0',
				},
			},
		})
		expect(Resolver.getState(resolved, 178)).toMatchObject({
			layers: {
				g0: {
					id: 'group0',
				},
				'2': {
					id: 'child1',
				},
			},
		})
		expect(Resolver.getState(resolved, 185).layers).toEqual({})
	})
	test('referencing child in parent group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 0,
					duration: 80,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							while: '#other',
						},
						content: {},
					},
				],
			},
			{
				id: 'other',
				layer: 'other',
				enable: {
					while: '1',
				},
				content: {},
			},
			{
				id: 'refChild0',
				layer: '42',
				enable: {
					while: '#child0',
				},
				content: {},
			},
		]

		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		// @ts-ignore object is possibly undefined
		timeline[0].children[0].enable.while = '1' // This shouldn't change the outcome, since it's changing from a reference that resolves to { while: '1' }

		const resolved1 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		const states0 = Resolver.getState(resolved0, 90)
		const states1 = Resolver.getState(resolved1, 90)

		expect(states0.layers['other']).toBeTruthy()
		expect(states1.layers['other']).toBeTruthy()

		expect(states0.layers['42']).toBeFalsy()
		expect(states1.layers['42']).toBeFalsy()

		const omitProperties = (instances: TimelineObjectInstance[]) => {
			return _.map(instances, (i) => _.omit(i, ['references', 'originalEnd', 'originalStart']))
		}
		expect(omitProperties(resolved0.objects['refChild0'].resolved.instances)).toEqual(
			omitProperties(resolved1.objects['refChild0'].resolved.instances)
		)
	})
	test('Content start time in capped object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'extRef',
				layer: 'e0',
				enable: {
					start: 10,
					duration: 200,
				},
				content: {},
			},
			{
				id: 'myGroup',
				layer: 'g0',
				enable: {
					start: 50,
					end: 100,
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'video',
						layer: '1',
						enable: {
							start: '#extRef',
							duration: 200,
						},
						content: {},
					},
					{
						id: 'interrupting',
						layer: '1',
						enable: {
							start: 10, // 60, will interrupt video in the middle of it
							duration: 10,
						},
						content: {},
					},
					{
						id: 'video2',
						layer: '2',
						enable: {
							start: '-10', // 40
							duration: 200,
						},
						content: {},
					},
					{
						id: 'interrupting2',
						layer: '2',
						enable: {
							while: '#interrupting',
						},
						content: {},
					},
				],
			},
		]
		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 })
		const resolved = Resolver.resolveAllStates(resolved0)

		expect(resolved.statistics.resolvedObjectCount).toEqual(6)
		expect(resolved.statistics.resolvedGroupCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['myGroup']).toBeTruthy()
		expect(resolved.objects['myGroup'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['interrupting']).toBeTruthy()
		expect(resolved.objects['interrupting'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['interrupting'].resolved.instances[0]).toMatchObject({
			start: 60,
			end: 70,
		})

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['video'].resolved.instances).toHaveLength(2)

		expect(resolved.objects['video'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 60,
			originalStart: 10,
			originalEnd: 210,
		})
		expect(resolved.objects['video'].resolved.instances[1]).toMatchObject({
			start: 70,
			end: 100,
			originalStart: 10,
			originalEnd: 210,
		})

		expect(resolved.objects['video2']).toBeTruthy()
		expect(resolved.objects['video2'].resolved.instances).toHaveLength(2)
		expect(resolved.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 60,
			originalStart: 40,
			originalEnd: 240,
		})
		expect(resolved.objects['video2'].resolved.instances[1]).toMatchObject({
			start: 70,
			end: 100,
			originalStart: 40,
			originalEnd: 240,
		})
	})
	test('Parent references', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'parent',
				layer: 'p0',
				priority: 0,
				enable: {
					start: '100',
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'video0',
						layer: '0',
						priority: 0,
						enable: {
							start: 20 + 30,
							duration: 10,
						},
						content: {},
					},
					{
						id: 'video1',
						layer: '1',
						priority: 0,
						enable: {
							start: '20 + 30',
							duration: 10,
						},
						content: {},
					},
				],
			},
			{
				id: 'video2',
				layer: '2',
				priority: 0,
				enable: {
					start: '150',
					duration: 10,
				},
				content: {},
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)

		// All 3 videos should start at the same time:
		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['video2']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['video1'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['video2'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['video0'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160,
		})
		expect(resolved.objects['video1'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160,
		})
		expect(resolved.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160,
		})
	})
	test('Child object with end time - numeric start', () => {
		const baseTime = 1599753027264.5 // Some real point in time
		const timeline: TimelineObject[] = [
			{
				id: 'grp0',
				enable: {
					start: baseTime,
				},
				layer: 'parent',
				content: {},
				isGroup: true,
				children: [
					{
						id: 'obj0',
						content: {},
						enable: {
							start: 0,
							duration: 480,
						},
						layer: 'layer0',
					},
					{
						id: 'obj1',
						content: {},
						enable: {
							start: 0,
							end: 86400000,
						},
						layer: 'layer1',
					},
				],
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: baseTime + 1000, limitCount: 10, limitTime: 999 })
		)
		expect(resolved.statistics.resolvedObjectCount).toEqual(3)

		// // All 3 videos should start at the same time:
		expect(resolved.objects['grp0']).toBeTruthy()
		expect(resolved.objects['obj0']).toBeTruthy()
		expect(resolved.objects['obj1']).toBeTruthy()
		expect(resolved.objects['grp0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['obj0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['obj1'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['grp0'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: null,
		})
		expect(resolved.objects['obj0'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: baseTime + 480,
		})
		expect(resolved.objects['obj1'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: baseTime + 86400000,
		})
	})
	test('Child object with end time - reference start', () => {
		const baseTime = 1599753027264.5 // Some real point in time
		const timeline: TimelineObject[] = [
			{
				id: 'grp0',
				enable: {
					start: baseTime,
				},
				layer: 'parent',
				content: {},
				isGroup: true,
				children: [
					{
						id: 'obj0',
						content: {},
						enable: {
							start: 0,
							duration: 480,
						},
						layer: 'layer0',
					},
					{
						id: 'obj1',
						content: {},
						enable: {
							start: '#obj0.start + 0',
							end: 86400000,
						},
						layer: 'layer1',
					},
				],
			},
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: baseTime + 1000, limitCount: 10, limitTime: 999 })
		)
		expect(resolved.statistics.resolvedObjectCount).toEqual(3)

		// // All 3 videos should start at the same time:
		expect(resolved.objects['grp0']).toBeTruthy()
		expect(resolved.objects['obj0']).toBeTruthy()
		expect(resolved.objects['obj1']).toBeTruthy()
		expect(resolved.objects['grp0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['obj0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['obj1'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['grp0'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: null,
		})
		expect(resolved.objects['obj0'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: baseTime + 480,
		})
		expect(resolved.objects['obj1'].resolved.instances[0]).toMatchObject({
			start: baseTime,
			end: baseTime + 86400000,
		})
	})
})
