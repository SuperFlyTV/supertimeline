/* eslint-disable jest/no-standalone-expect */

import { EventType, TimelineObjectInstance } from '../'
import { describeVariants, resolveTimeline, getResolvedState } from './testlib'
import { omit } from '../resolver/lib/lib'
import { baseInstances } from '../resolver/lib/instance'

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

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0 })
			expect(resolved.statistics.resolvedObjectCount).toEqual(4)
			expect(resolved.statistics.resolvedGroupCount).toEqual(1)

			expect(resolved.objects['group']).toBeTruthy()
			expect(resolved.objects['child0']).toBeTruthy()
			expect(resolved.objects['child1']).toBeTruthy()
			expect(resolved.objects['child0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 15, end: 25 }],
			})
			expect(resolved.objects['child1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 25, end: 35 }],
			})
			expect(resolved.objects['child2'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 10, end: 100 }],
			})

			const state0 = getResolvedState(resolved, 11)
			expect(state0.layers).toMatchObject({
				'0': {
					id: 'group',
				},
			})
			expect(state0.layers['1']).toBeFalsy()

			expect(getResolvedState(resolved, 15)).toMatchObject({
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
			expect(getResolvedState(resolved, 30)).toMatchObject({
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
		test('transparent groups', () => {
			// "transparent groups" are groups without a layer
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

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0 })

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			expect(resolved.objects['group0']).toBeTruthy()
			expect(resolved.objects['child0']).toBeTruthy()
			expect(resolved.objects['group1']).toBeTruthy()
			expect(resolved.objects['child1']).toBeTruthy()

			expect(resolved.objects['group0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 10, end: 100 }],
			})
			expect(resolved.objects['child0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 15, end: 100 }],
			})
			expect(resolved.objects['group1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 50, end: 100 }],
			})
			expect(resolved.objects['child1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 55, end: 100 }],
			})

			expect(getResolvedState(resolved, 16).layers).toMatchObject({
				'1': {
					id: 'child0',
				},
			})
			expect(getResolvedState(resolved, 56)).toMatchObject({
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
			const state0 = getResolvedState(resolved, 120)
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

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0 })

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			expect(resolved.objects['group0']).toBeTruthy()
			expect(resolved.objects['child0']).toBeTruthy()
			expect(resolved.objects['group1']).toBeTruthy()
			expect(resolved.objects['child1']).toBeTruthy()

			expect(resolved.objects['group0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 10, end: 50 }], // because group 1 started
			})
			expect(resolved.objects['child0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 15, end: 50 }], // capped by parent
			})
			expect(resolved.objects['group1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 50, end: 100 }],
			})
			expect(resolved.objects['child1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 55, end: 100 }],
			})

			expect(getResolvedState(resolved, 16)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
					'1': {
						id: 'child0',
					},
				},
				nextEvents: [
					{ objId: 'child0', time: 50, type: EventType.END },
					{ objId: 'group0', time: 50, type: EventType.END },
					{ objId: 'group1', time: 50, type: EventType.START },

					{ objId: 'child1', time: 55, type: EventType.START },

					{ objId: 'child1', time: 100, type: EventType.END },
					{ objId: 'group1', time: 100, type: EventType.END },
				],
			})
			expect(getResolvedState(resolved, 56)).toMatchObject({
				layers: {
					g0: {
						id: 'group1',
					},
					'2': {
						id: 'child1',
					},
				},
				nextEvents: [
					{ objId: 'child1', time: 100, type: EventType.END },
					{ objId: 'group1', time: 100, type: EventType.END },
				],
			})
			const state1 = getResolvedState(resolved, 120)
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
						start: 0,
						duration: 80,
						repeating: 100,
						// 0-80, 100-180...
					},
					content: {},
					isGroup: true,
					children: [
						{
							id: 'child0',
							layer: '1',
							enable: {
								start: '50',
								duration: 20,
								// 50-70, 150-170...
							},
							content: {},
						},
						{
							id: 'child1',
							layer: '2',
							enable: {
								start: '#child0.end',
								duration: 50,
								// 70-120, 170-220
								// capped by parent to: 70-80, 170-180
							},
							content: {},
						},
					],
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitTime: 199,
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)

			expect(resolved.objects['group0']).toBeTruthy()
			expect(resolved.objects['child0']).toBeTruthy()
			expect(resolved.objects['child1']).toBeTruthy()

			expect(baseInstances(resolved.objects['group0'].resolved.instances)).toMatchObject([
				{ start: 0, end: 80 },
				{ start: 100, end: 180 },
			])
			expect(baseInstances(resolved.objects['child0'].resolved.instances)).toMatchObject([
				{ start: 50, end: 70 },
				{ start: 150, end: 170 },
			])
			expect(baseInstances(resolved.objects['child1'].resolved.instances)).toMatchObject([
				{ start: 70, end: 80 },
				{ start: 170, end: 180 },
			])
			expect(getResolvedState(resolved, 10)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
				},
			})
			expect(getResolvedState(resolved, 55)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
					'1': {
						id: 'child0',
					},
				},
			})
			expect(getResolvedState(resolved, 78)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
					'2': {
						id: 'child1',
					},
				},
			})
			expect(getResolvedState(resolved, 85).layers).toEqual({})

			expect(getResolvedState(resolved, 110)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
				},
			})
			expect(getResolvedState(resolved, 155)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
					'1': {
						id: 'child0',
					},
				},
			})
			expect(getResolvedState(resolved, 178)).toMatchObject({
				layers: {
					g0: {
						id: 'group0',
					},
					'2': {
						id: 'child1',
					},
				},
			})
			expect(getResolvedState(resolved, 185).layers).toEqual({})
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

			const resolved0 = resolveTimeline(timeline, {
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

			const resolved1 = resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 99,
				limitTime: 199,
			})

			const states0 = getResolvedState(resolved0, 90)
			const states1 = getResolvedState(resolved1, 90)

			expect(states0.layers['other']).toBeTruthy()
			expect(states1.layers['other']).toBeTruthy()

			expect(states0.layers['42']).toBeFalsy()
			expect(states1.layers['42']).toBeFalsy()

			const omitProperties = (instances: TimelineObjectInstance[]) => {
				return instances.map((i) => omit(i, ['references', 'originalEnd', 'originalStart', 'id']))
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
								// 10 - 210,
								// capped to 50-100,
								// interrupted to  50-60
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

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 100,
				limitTime: 99999,
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(6)
			expect(resolved.statistics.resolvedGroupCount).toEqual(1)

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

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 10,
				limitTime: 999,
			})

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

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

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

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

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

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

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

			expect(getResolvedState(resolved, baseTime + 110).layers['layer1']).toMatchObject({ id: 'grp0' })
			expect(getResolvedState(resolved, baseTime + 110).layers['layer1_0']).toMatchObject({ id: 'grp0_obj0' })

			expect(getResolvedState(resolved, baseTime + 130).layers['layer1']).toMatchObject({ id: 'grp1' })

			// Should be empty, since it is capped by its parent (also evidenced by the instances before)
			expect(getResolvedState(resolved, baseTime + 130).layers['layer1_0']).toBeFalsy()
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
					// Possibly undefined behaviour:
					// Needs discussion: what should happen when a repeating object is followed by a non-repeating object?
					// I've set the priority to 1 to force the behavior to what the test needs for now / Johan 2021-10-21
					priority: 1,
				},
			])

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0, limitCount: 10 })

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
			expect(resolved.objects['grp0_grp1'].resolved.instances).toMatchObject([{ start: 1350, end: 1400 }])

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

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0 })

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
						// 1000 - 6000
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
								/// 1000 - 6000
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
						// 5000-inf
					},
					priority: 1,
					layer: '',
					content: {},
					children: [
						{
							id: 'grp1_0',
							enable: {
								start: 0,
								/// 5000-inf, conflict w grp0_0: 6000-inf
							},
							priority: 2,
							content: {},
							children: [
								{
									id: 'grp1_0_0',
									enable: {
										start: 1000,
										// 6000-inf, -> 7000-inf
									},
									priority: 1,
									layer: 'layer1',
									content: {},
								},
							],
							isGroup: true,
							layer: 'layer0',
						},
					],
					isGroup: true,
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(5)

			expect(resolved.objects['grp1'].resolved.instances).toMatchObject([{ start: 5000, end: null }])
			expect(resolved.objects['grp0'].resolved.instances).toMatchObject([{ start: 1000, end: 6000 }])
			// grp0_0 runs for a while
			expect(resolved.objects['grp0_0'].resolved.instances).toMatchObject([{ start: 1000, end: 6000 }])

			// grp1_0 runs once grp0_0 has cleared
			expect(resolved.objects['grp1_0'].resolved.instances).toMatchObject([{ start: 6000, end: null }])

			// grp1_0_0 start 1000 after grp1_0
			expect(resolved.objects['grp1_0_0'].resolved.instances).toMatchObject([{ start: 7000, end: null }])
		})

		test('Child object', () => {
			const baseTime = 3000 // Some real point in time
			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: 1000,
						end: '#grp1.start + 300',
					},
					priority: 1,
					layer: 'layer1',
					content: {},
					children: [
						{
							id: 'grp0_0',
							content: {},
							enable: {
								start: 0,
							},
							layer: 'layer0',
							priority: 2,
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
					layer: 'layer1',
					content: {},
					children: [
						{
							id: 'grp1_0',
							content: {},
							enable: {
								start: 500,
							},
							layer: 'layer0',
							priority: 2,
						},
					],
					isGroup: true,
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			// grp0_0 runs for a while
			expect(resolved.objects['grp0_0']).toBeTruthy()
			expect(resolved.objects['grp0_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp0_0'].resolved.instances[0]).toMatchObject({
				start: 1000,
				end: 5000,
			})

			// grp1_0 runs once grp0_0 has cleared
			expect(resolved.objects['grp1_0']).toBeTruthy()
			expect(resolved.objects['grp1_0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['grp1_0'].resolved.instances[0]).toMatchObject({
				start: 5500,
				end: null,
			})

			{
				// Clearly in grp0
				const state = getResolvedState(resolved, 4999)
				expect(state.layers['layer1']).toBeTruthy()
				expect(state.layers['layer1']).toMatchObject({
					id: 'grp0',
				})

				expect(state.layers['layer0']).toBeTruthy()
				expect(state.layers['layer0']).toMatchObject({
					id: 'grp0_0',
				})
			}
			{
				// Clearly in grp1
				const state = getResolvedState(resolved, 5600)
				expect(state.layers['layer1']).toBeTruthy()
				expect(state.layers['layer1']).toMatchObject({
					id: 'grp1',
				})

				expect(state.layers['layer0']).toBeTruthy()
				expect(state.layers['layer0']).toMatchObject({
					id: 'grp1_0',
				})
			}
			{
				// after 'end' of grp0
				const state = getResolvedState(resolved, 5400)
				expect(state.layers['layer1']).toBeTruthy()
				expect(state.layers['layer1']).toMatchObject({
					id: 'grp1',
				})

				expect(state.layers['layer0']).toBeFalsy()
			}
			{
				// before 'end' of grp0
				const state = getResolvedState(resolved, 5200)
				expect(state.layers['layer1']).toBeTruthy()
				expect(state.layers['layer1']).toMatchObject({
					id: 'grp1',
				})

				expect(state.layers['layer0']).toBeFalsy()
			}
		})

		test('Child object partially blocked by other object', () => {
			const timeline = fixTimeline([
				{
					id: 'tema_baseline',
					enable: {
						while: 1,
					},
					priority: 0,
					layer: 'l1',
					content: {},
				},

				{
					id: 'group0',
					enable: {
						start: 1000,
						end: '#group1.start + 480',
					},
					priority: -1,
					layer: '',
					content: {},
					children: [
						{
							id: 'group2',
							content: {},
							children: [
								// Note: moving this out a level gives different results
								{
									id: 'tema_capped',
									enable: {
										start: 0,
									},
									priority: 1,
									layer: 'l1',
									content: {},
								},
							],
							isGroup: true,
							enable: {
								start: 700,
							},
							layer: '',
						},
					],
					isGroup: true,
				},

				{
					id: 'group1',
					enable: {
						start: 2000,
					},
					priority: 5,
					layer: '',
					content: {},
					children: [
						{
							id: 'tema_blocker',
							enable: {
								start: 0,
								duration: 480,
							},
							priority: 10,
							layer: 'l1',
							content: {},
						},
					],
					isGroup: true,
				},
			])

			const resolved = resolveTimeline(timeline, {
				time: 0,
				cache: getCache(),
			})

			// make sure the events look sane
			expect(resolved.nextEvents).toStrictEqual([
				{ objId: 'tema_baseline', time: 1700, type: 1 },
				{ objId: 'tema_capped', time: 1700, type: 0 },
				{ objId: 'tema_capped', time: 2000, type: 1 },
				{ objId: 'tema_blocker', time: 2000, type: 0 },
				{ objId: 'tema_blocker', time: 2480, type: 1 },
				{ objId: 'tema_capped', time: 2480, type: 1 },
				{ objId: 'tema_baseline', time: 2480, type: 0 },
				{ objId: 'tema_capped', time: 2480, type: 0 },
			])

			const state1 = getResolvedState(resolved, 5000)
			expect(state1.layers['l1']).toBeTruthy()
			expect(state1.layers['l1'].id).toBe('tema_baseline') // baseline
			expect(state1.layers['l1'].instance.start).toBe(2480)
			expect(state1.layers['l1'].instance.end).toBe(null)
		})

		test('Child object partially blocked by other object: with no baseline', () => {
			const baseTime = 3000 // Some real point in time
			const timeline = fixTimeline([
				{
					id: 'group0',
					enable: {
						start: 1000,
						end: '#group1.start + 480',
					},
					priority: -1,
					layer: '',
					content: {},
					children: [
						{
							id: 'group2',
							content: {},
							children: [
								// Note: moving this out a level gives different results
								{
									id: 'tema_capped',
									enable: {
										start: 0,
									},
									priority: 1,
									layer: 'l1',
									content: {},
								},
							],
							isGroup: true,
							enable: {
								start: 700,
							},
							layer: '',
						},
					],
					isGroup: true,
				},

				{
					id: 'group1',
					enable: {
						start: 2000,
					},
					priority: 5,
					layer: '',
					content: {},
					children: [
						{
							id: 'tema_blocker',
							enable: {
								start: 0,
								duration: 480,
							},
							priority: 10,
							layer: 'l1',
							content: {},
						},
					],
					isGroup: true,
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

			const state1 = getResolvedState(resolved, 5000)
			expect(state1.layers['l1']).toBeFalsy()
		})

		test('Dependent object stops with ref', () => {
			const baseTime = 3000 // Some real point in time
			const timeline = fixTimeline([
				{
					id: 'grp0',
					enable: {
						start: 1000,
					},
					priority: 1,
					layer: '',
					content: {},
					children: [
						{
							id: 'child0_control',
							enable: {
								start: 0,
							},
							layer: 'l1',
							priority: 1,
							content: {},
						},
						{
							id: 'child0',
							content: {},
							children: [
								{
									id: 'obj0',
									enable: {
										start: 0,
									},
									priority: 6,
									layer: 'nora_primary_logo',
									content: {},
								},
							],
							isGroup: true,
							enable: {
								start: '#child0_control.start - 160',
								end: '#child0_control.end + 0',
							},
							layer: 'test',
						},
					],
					isGroup: true,
				},

				{
					id: 'grp1',
					enable: {
						start: 5000,
					},
					priority: 5,
					layer: '',
					content: {},
					children: [
						{
							id: 'child1',
							enable: {
								start: 320,
							},
							layer: 'l1',
							priority: 5,
							content: {},
						},
					],
					isGroup: true,
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: baseTime + 1000,
				limitCount: 10,
				limitTime: 999,
			})

			{
				// While child0_control is on l1
				const state1 = getResolvedState(resolved, 2000)
				expect(state1.layers['l1']).toBeTruthy()
				expect(state1.layers['l1'].id).toBe('child0_control') // baseline
				expect(state1.layers['l1'].instance.start).toBe(1000)
				expect(state1.layers['l1'].instance.end).toBe(5320)

				expect(state1.layers['test']).toBeTruthy()
				expect(state1.layers['test'].id).toBe('child0') // baseline
				expect(state1.layers['test'].instance.start).toBe(1000)
				expect(state1.layers['test'].instance.end).toBe(5320)
			}

			{
				// While child1 is on l1
				const state1 = getResolvedState(resolved, 6000)
				expect(state1.layers['l1']).toBeTruthy()
				expect(state1.layers['l1'].id).toBe('child1') // baseline
				expect(state1.layers['l1'].instance.start).toBe(5320)
				expect(state1.layers['l1'].instance.end).toBe(null)

				expect(state1.layers['test']).toBeFalsy()
			}
		})

		test('Dependent object stops when referenced object is interrupted', () => {
			const timeline = fixTimeline([
				{
					id: 'obj_interrupted',
					enable: {
						start: 1000,
						end: 9999,
					},
					priority: 1,
					layer: 'L1',
					content: {},
				},
				{
					id: 'obj_interruptee',
					enable: {
						start: 2000,
					},
					priority: 1,
					layer: 'L1',
					content: {},
				},
				{
					id: 'other_obj',
					enable: {
						start: '#obj_interrupted.end',
					},
					priority: 1,
					layer: 'L2',
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, {
				cache: getCache(),
				time: 0,
				limitCount: 10,
				limitTime: 999,
			})

			expect(resolved.objects['obj_interruptee'].resolved.instances).toMatchObject([
				{
					start: 2000,
					end: null,
				},
			])
			expect(resolved.objects['obj_interrupted'].resolved.instances).toMatchObject([
				{
					start: 1000,
					end: 2000,
				},
			])
			expect(resolved.objects['other_obj'].resolved.instances).toMatchObject([
				{
					start: 2000,
					end: null,
				},
			])
		})

		test('Referencing and replacing a same-layer child of a group from the outside', () => {
			const timeline = fixTimeline([
				{
					id: 'group',
					enable: { start: 1000 },
					priority: 0,
					layer: '',
					content: {},
					children: [
						{
							id: 'obj_inside',
							enable: { start: 0 },
							layer: 'L1',
							content: { value: 'wrong' },
							priority: 0,
						},
					],
					isGroup: true,
				},
				{
					id: 'obj_outside',
					enable: { start: '#obj_inside.start' },
					layer: 'L1',
					content: { value: 'right' },
					priority: 1,
				},
			])
			const time = 1000
			const resolved = resolveTimeline(timeline, { time, cache: getCache() })

			const state0 = getResolvedState(resolved, time)
			expect(state0.time).toEqual(time)
			expect(state0.layers).toMatchObject({
				L1: {
					content: { value: 'right' },
				},
			})
		})

		test('Relative to end of parent group', () => {
			const timeline = fixTimeline([
				{
					id: 'group',
					enable: { start: 1000, end: 5000 },
					priority: 0,
					layer: '',
					content: {},
					children: [
						{
							id: 'obj_inside',
							enable: { start: 0, end: '##parent.end - 1000' },
							layer: 'L1',
							content: {},
							priority: 0,
						},
					],
					isGroup: true,
				},
			])
			const time = 1000
			const resolved = resolveTimeline(timeline, { time, cache: getCache() })

			const obj_inside = resolved.objects['obj_inside']
			expect(obj_inside).toBeTruthy()
			expect(obj_inside.resolved.instances).toHaveLength(1)
			expect(obj_inside.resolved.instances[0]).toMatchObject({
				start: 1000,
				end: 5000 - 1000,
			})
		})

		test('Relative to end of parent group - interrupted', () => {
			const timeline = fixTimeline([
				{
					id: 'group',
					enable: { start: 1000 },
					priority: 0,
					layer: 'LG',
					content: {},
					children: [
						{
							id: 'obj_inside',
							enable: { start: 0, end: '##parent.end - 1000' },
							layer: 'L1',
							content: {},
							priority: 0,
						},
					],
					isGroup: true,
				},
				{
					id: 'group2',
					enable: { start: 5000 },
					priority: 0,
					layer: 'LG',
					content: {},
					children: [],
					isGroup: true,
				},
			])
			const time = 1000
			const resolved = resolveTimeline(timeline, { time, cache: getCache() })

			const obj_inside = resolved.objects['obj_inside']
			expect(obj_inside).toBeTruthy()
			expect(obj_inside.resolved.instances).toHaveLength(1)
			expect(obj_inside.resolved.instances[0]).toMatchObject({
				start: 1000,
				end: 5000 - 1000,
			})
		})
	},
	{
		normal: true,
		reversed: false,
		cache: false,
	}
)
