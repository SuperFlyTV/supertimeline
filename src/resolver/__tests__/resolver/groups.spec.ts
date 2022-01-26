import * as _ from 'underscore'
import { EventType, Resolver, TimelineObjectInstance } from '../../..'
import { describeVariants } from '../testlib'

describeVariants(
	'Resolver, groups',
	(test, fixTimeline, getCache) => {
		beforeEach(() => {
			// resetId()
		})
		test('simple group', () => {
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveTimeline(timeline, { cache: getCache(), time: 0 })
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
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveTimeline(timeline, { cache: getCache(), time: 0 })

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
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, { cache: getCache(), time: 0 })
			)

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
				instances: [{ start: 15, end: 50 }], // capped by parent
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
		test('cap in repeating parent group', () => {
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 99,
				limitTime: 199,
			})

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
			const group0 = {
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
			}
			const other = {
				id: 'other',
				layer: 'other',
				enable: {
					while: '1',
				},
				content: {},
			}
			const refChild0 = {
				id: 'refChild0',
				layer: '42',
				enable: {
					while: '#child0',
				},
				content: {},
			}
			const timeline = fixTimeline([group0, other, refChild0])

			const resolved0 = Resolver.resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 99,
				limitTime: 199,
			})

			const child0 = group0.children.find((o) => o.id === 'child0')
			expect(child0).toBeTruthy()
			if (child0) {
				child0.enable.while = '1' // This shouldn't change the outcome, since it's changing from a reference that resolves to { while: '1' }
			}

			const resolved1 = Resolver.resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 99,
				limitTime: 199,
			})

			const states0 = Resolver.getState(resolved0, 90)
			const states1 = Resolver.getState(resolved1, 90)

			expect(states0.layers['other']).toBeTruthy()
			expect(states1.layers['other']).toBeTruthy()

			expect(states0.layers['42']).toBeFalsy()
			expect(states1.layers['42']).toBeFalsy()

			const omitProperties = (instances: TimelineObjectInstance[]) => {
				return _.map(instances, (i) => _.omit(i, ['references', 'originalEnd', 'originalStart', 'id']))
			}
			expect(omitProperties(resolved0.objects['refChild0'].resolved.instances)).toEqual(
				omitProperties(resolved1.objects['refChild0'].resolved.instances)
			)
		})
		test('Content start time in capped object', () => {
			const timeline = fixTimeline([
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
			])

			const resolved0 = Resolver.resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 100,
				limitTime: 99999,
			})
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
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, {
					cache: getCache(),
					time: 0,
					limitCount: 10,
					limitTime: 999,
				})
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
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, {
					cache: getCache(),
					time: baseTime + 1000,
					limitCount: 10,
					limitTime: 999,
				})
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
			const timeline = fixTimeline([
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
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, {
					cache: getCache(),
					time: baseTime + 1000,
					limitCount: 10,
					limitTime: 999,
				})
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
		test('groups replacing each other, capping children', () => {
			const baseTime = 1000 // Some real point in time
			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: baseTime + 100,
					},
					layer: 'layer1',
					content: {},
					isGroup: true,
					children: [
						{
							id: 'grp0_obj0',
							content: {},
							enable: {
								start: 0,
							},
							layer: 'layer1_0',
						},
					],
				},
				{
					id: 'grp1',
					enable: {
						start: baseTime + 120,
					},
					layer: 'layer1',
					content: {},
					isGroup: true,
					children: [],
				},
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, {
					cache: getCache(),
					time: baseTime + 1000,
					limitCount: 10,
					limitTime: 999,
				})
			)

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.objects['grp0']).toBeTruthy()
			expect(resolved.objects['grp0_obj0']).toBeTruthy()
			expect(resolved.objects['grp1']).toBeTruthy()
			expect(resolved.objects['grp0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp0_obj0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp1'].resolved.instances).toHaveLength(1)

			// expect grp0 to be ended by grp1 replacing it on the layer
			expect(resolved.objects['grp0'].resolved.instances).toMatchObject([
				{
					start: baseTime + 100,
					end: baseTime + 120,
				},
			])
			// expect grp0_obj0 to be ended by grp0 ending, ended by grp1 replacing it
			expect(resolved.objects['grp0_obj0'].resolved.instances).toMatchObject([
				{
					start: baseTime + 100,
					end: baseTime + 120,
				},
			])
			// expect grp1 to be infinite
			expect(resolved.objects['grp1'].resolved.instances[0].end).toBe(null)
			expect(resolved.objects['grp1'].resolved.instances).toMatchObject([
				{
					start: baseTime + 120,
					end: null,
				},
			])
		})
		test('groups replacing each other, capping children in lower levels', () => {
			// ensure that capping of children works multiple levels down, and with repeating parents

			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: 1000,
						duration: 400,
						repeating: 500,
					},
					layer: 'layer0',
					content: {},
					isGroup: true,
					children: [
						{
							id: 'grp0_grp0',
							enable: {
								start: 10, // 1010, 1510
							},
							layer: 'layer00',
							content: {},
							isGroup: true,
							children: [
								{
									id: 'grp0_grp0_obj0',
									content: {},
									enable: {
										start: 10, // 1020, 1520
									},
									layer: 'layer000',
								},
							],
						},
						{
							id: 'grp0_grp1',
							enable: {
								start: 350, // 1350, 1850
							},
							layer: 'layer00',
							content: {},
							isGroup: true,
							children: [],
						},
					],
				},
				{
					id: 'grp1',
					enable: {
						start: 1700,
					},
					layer: 'layer0',
					content: {},
					isGroup: true,
					children: [],
					// Todo: needs discussion: what should happen when a repeating object is followed by a non-repeating object?
					// I've set the priority to 1 to force the behavior to what the test needs for now / Johan 2021-10-21
					priority: 1,
				},
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, { cache: getCache(), time: 0, limitCount: 10 })
			)

			// The outer group should be capped by the next one:
			expect(resolved.objects['grp0'].resolved.instances).toMatchObject([
				{ start: 1000, end: 1400 },
				{ start: 1500, end: 1700 },
			])
			expect(resolved.objects['grp1'].resolved.instances).toMatchObject([{ start: 1700, end: null }])

			// The inner group should be capped by the next one (and capped by the outer group at 1700):
			expect(resolved.objects['grp0_grp0'].resolved.instances).toMatchObject([
				{ start: 1010, end: 1350 },
				{ start: 1510, end: 1700 },
			])
			expect(resolved.objects['grp0_grp1'].resolved.instances).toMatchObject([
				{ start: 1350, end: 1400 },
				// { start: 1850, end: 1700 },
			])

			// The inner object should be capped by its parents
			expect(resolved.objects['grp0_grp0_obj0'].resolved.instances).toMatchObject([
				{ start: 1020, end: 1350 },
				{ start: 1520, end: 1700 },
			])
		})
		test('Nested children not starting with parent', () => {
			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: 1000,
						end: '#grp1.start + 1000', // 6000
					},
					priority: -1,
					layer: '',
					content: {},
					children: [
						{
							id: 'grp0_0',
							content: {},
							children: [],
							enable: {
								start: 0, // 1000, ends at 6000
							},
							layer: 'layer0',
							isGroup: true,
							priority: 5,
						},
					],
					isGroup: true,
				},
				{
					id: 'grp1',
					enable: {
						start: 5000,
					},
					priority: 1,
					layer: '',
					content: {},
					children: [
						{
							id: 'grp1_0',
							content: {},
							children: [
								{
									id: 'obj0',
									enable: {
										start: 0, // 5000
									},
									priority: 1,
									layer: 'layer1',
									content: {},
								},
							],
							isGroup: true,
							enable: {
								start: 0, // 5000
							},
							layer: 'layer0',
							priority: 2,
						},
					],
					isGroup: true,
				},
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, { cache: getCache(), time: 0 })
			)

			expect(resolved.statistics.resolvedObjectCount).toEqual(5)

			// grp0_0 runs for a while
			expect(resolved.objects['grp0_0']).toBeTruthy()
			expect(resolved.objects['grp0_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp0_0'].resolved.instances[0]).toMatchObject({
				start: 1000,
				end: 6000,
			})

			// grp1_0 runs once grp0_0 has cleared
			expect(resolved.objects['grp1_0']).toBeTruthy()
			expect(resolved.objects['grp1_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp1_0'].resolved.instances[0]).toMatchObject({
				start: 6000,
				end: null,
			})

			// obj0 runs the same as grp1_0
			expect(resolved.objects['obj0']).toBeTruthy()
			expect(resolved.objects['obj0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['obj0'].resolved.instances[0]).toMatchObject({
				start: 6000,
				end: null,
			})
		})
		test('Nested children starting with parent', () => {
			const baseTime = 3000 // Some real point in time
			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: 1000,
						end: '#grp1.start + 1000',
					},
					priority: -1,
					layer: '',
					content: {},
					children: [
						{
							id: 'grp0_0',
							content: {},
							children: [],
							enable: {
								start: 0,
							},
							layer: 'layer0',
							isGroup: true,
							priority: 5,
						},
					],
					isGroup: true,
				},
				{
					id: 'grp1',
					enable: {
						start: 5000,
					},
					priority: 1,
					layer: '',
					content: {},
					children: [
						{
							id: 'grp1_0',
							content: {},
							children: [
								{
									id: 'obj0',
									enable: {
										start: 1000,
									},
									priority: 1,
									layer: 'layer1',
									content: {},
								},
							],
							isGroup: true,
							enable: {
								start: 0,
							},
							layer: 'layer0',
							priority: 2,
						},
					],
					isGroup: true,
				},
			])

			const resolved = Resolver.resolveAllStates(
				Resolver.resolveTimeline(timeline, {
					cache: getCache(),
					time: baseTime + 1000,
					limitCount: 10,
					limitTime: 999,
				})
			)
			expect(resolved.statistics.resolvedObjectCount).toEqual(5)

			// grp0_0 runs for a while
			expect(resolved.objects['grp0_0']).toBeTruthy()
			expect(resolved.objects['grp0_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp0_0'].resolved.instances[0]).toMatchObject({
				start: 1000,
				end: 6000,
			})

			// grp1_0 runs once grp0_0 has cleared
			expect(resolved.objects['grp1_0']).toBeTruthy()
			expect(resolved.objects['grp1_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp1_0'].resolved.instances[0]).toMatchObject({
				start: 6000,
				end: null,
			})

			// obj0 runs the same as grp1_0
			expect(resolved.objects['obj0']).toBeTruthy()
			expect(resolved.objects['obj0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['obj0'].resolved.instances[0]).toMatchObject({
				start: 6000,
				end: null,
			})
		})
	},
	{
		normal: true,
		reversed: true,
		cache: true,
	}
)
