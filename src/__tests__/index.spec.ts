import {
	TimelineObject,
	ResolveOptions,
	EventType,
	validateObject,
	validateTimeline,
	resolveTimeline,
	getResolvedState,
	applyKeyframeContent,
} from '../index'
import { baseInstances } from '../resolver/lib/instance'
import { clone } from '../resolver/lib/lib'

describe('index', () => {
	test('resolve timeline', () => {
		const timeline: Array<TimelineObject> = [
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
					start: '#video.start + 10',
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10',
					duration: 15,
				},
				content: {},
			},
		]
		// First, just to a validation, to make sure it's okay:
		validateTimeline(timeline, true)

		// Example on how to validate a single object:
		validateObject(timeline[0], true)

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['video']).toBeTruthy()
		expect(resolvedTimeline.objects['video'].resolved).toMatchObject({
			resolvedReferences: true,
			resolvedConflicts: true,
			resolving: false,
		})
		expect(resolvedTimeline.objects['video'].resolved.instances).toMatchObject([{ start: 0, end: 100 }])

		expect(resolvedTimeline.objects['graphic0']).toBeTruthy()
		expect(resolvedTimeline.objects['graphic0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])

		expect(resolvedTimeline.objects['graphic1']).toBeTruthy()
		expect(resolvedTimeline.objects['graphic1'].resolved.instances).toMatchObject([{ start: 30, end: 45 }])

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline, 15)

		expect(state0).toMatchObject({
			layers: {
				'0': { id: 'video' },
				'1': { id: 'graphic0' },
			},
			nextEvents: [
				{ time: 20, type: EventType.END, objId: 'graphic0' },
				{ time: 30, type: EventType.START, objId: 'graphic1' },
				{ time: 45, type: EventType.END, objId: 'graphic1' },
				{ time: 100, type: EventType.END, objId: 'video' },
			],
		})
	})
	test('id:s should be consistent', () => {
		const timeline: Array<TimelineObject> = [
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
					while: '!#video.start',
				},
				content: {},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							start: 2,
							duration: 2,
							repeating: 10,
						},
						content: {},
					},
				],
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline0 = resolveTimeline(timeline, options)
		const resolvedTimeline1 = resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline0, 15)
		const state1 = getResolvedState(resolvedTimeline1, 15)

		expect(resolvedTimeline0).toEqual(resolvedTimeline1)
		expect(state0).toEqual(state1)
	})
	test('keyframe content', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 100,
				},
				content: {
					attr1: 0,
					attr2: 0,
				},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							start: 5,
							end: 20,
						},
						content: {
							attr2: 1,
							attr3: 1,
						},
					},
				],
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['kf0'].resolved.instances).toMatchObject([{ start: 5, end: 20 }])

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline, 4)
		const state1 = getResolvedState(resolvedTimeline, 15)
		const state2 = getResolvedState(resolvedTimeline, 21)

		expect(state0.layers[0].content.attr1).toEqual(0)
		expect(state1.layers[0].content.attr1).toEqual(0)
		expect(state2.layers[0].content.attr1).toEqual(0)

		expect(state0.layers[0].content.attr2).toEqual(0)
		expect(state1.layers[0].content.attr2).toEqual(1)
		expect(state2.layers[0].content.attr2).toEqual(0)

		expect(state0.layers[0].content.attr3).toEqual(undefined)
		expect(state1.layers[0].content.attr3).toEqual(1)
		expect(state2.layers[0].content.attr3).toEqual(undefined)
	})

	test('Resolve all states', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					end: 100,
					// 0-100 (0-50, 70-100)
				},
				content: {},
				priority: 5,
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: 50,
					end: 70,
					// 50-70 (50-65)
				},
				content: {},
				priority: 5,
			},
			{
				id: 'video2',
				layer: '0',
				enable: {
					start: 65,
					end: 75,
					// 65-75 (65-70)
				},
				content: {},
				priority: 5,
			},
			{
				id: 'video3',
				layer: '0',
				enable: {
					start: 50,
					end: 120,
					// 50-120
				},
				content: {},
				priority: 3, // lower prio
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline, 20)
		const state1 = getResolvedState(resolvedTimeline, 60)
		const state2 = getResolvedState(resolvedTimeline, 65)
		const state3 = getResolvedState(resolvedTimeline, 80)
		const state4 = getResolvedState(resolvedTimeline, 110)

		expect(state0.layers[0].id).toEqual('video0')
		expect(state1.layers[0].id).toEqual('video1')
		expect(state2.layers[0].id).toEqual('video2')
		expect(state3.layers[0].id).toEqual('video0')
		expect(state4.layers[0].id).toEqual('video3')

		expect(resolvedTimeline.objects['video0'].resolved.instances).toHaveLength(2)
		expect(resolvedTimeline.objects['video0'].resolved.instances[0]).toMatchObject({
			start: 0,
			end: 50,
		})
		expect(resolvedTimeline.objects['video0'].resolved.instances[1]).toMatchObject({
			start: 75,
			end: 100,
		})

		expect(resolvedTimeline.objects['video1'].resolved.instances).toHaveLength(1)
		expect(resolvedTimeline.objects['video1'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 65,
		})
		expect(resolvedTimeline.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 65,
			end: 75,
		})

		expect(resolvedTimeline.objects['video2'].resolved.instances).toHaveLength(1)
		expect(resolvedTimeline.objects['video3'].resolved.instances[0]).toMatchObject({
			start: 100,
			end: 120,
		})
	})
	test('parenthesis with negation', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'sun',
				layer: 'sun',
				enable: {
					start: 40,
					end: 100,
				},
				content: {},
			},
			{
				id: 'moon',
				layer: 'moon',
				enable: {
					start: 10,
					end: 80,
				},
				content: {},
			},
			{
				id: 'jupiter',
				layer: 'jupiter',
				enable: {
					start: 60,
					end: 130,
				},
				content: {},
			},
			{
				id: 'myObject',
				layer: 'L1',
				enable: {
					while: '#sun & !(#moon & #jupiter ) ', // Enable while #sun (but not #moon and #jupiter) are enabled.
				},
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['myObject'].resolved.instances).toMatchObject([
			{ start: 40, end: 60 },
			{ start: 80, end: 100 },
		])
	})
	test('class applies when defined multiple places', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'o1',
				enable: {
					while: '.some_class',
				},
				priority: 1,
				layer: 'layer0',
				content: {},
			},
			{
				id: 'o5',
				priority: 0.1,
				enable: {
					start: 1,
					// 1-500, 1000-null
				},
				layer: 'layer1',
				classes: ['some_class'],
				content: {},
			},
			{
				id: 'g0',
				enable: {
					start: 500,
					end: 1000,
				},
				priority: -1,
				layer: '',
				content: {},
				children: [
					{
						id: 'bad0',
						priority: 0,
						enable: {
							start: 0, // 500
							// 500-1000
						},
						layer: 'layer1',
						classes: ['some_class'],
						content: {},
					},
				],
				isGroup: true,
			},
		]

		const options: ResolveOptions = {
			time: 1500,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline, 1500)

		expect(state0.layers['layer1']).toBeTruthy()
		expect(state0.layers['layer1'].id).toEqual('o5')
		expect(state0.layers['layer0']).toBeTruthy()
		expect(state0.layers['layer0'].id).toEqual('o1')
	})
	test('instances', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'video',
				layer: '0',
				enable: [
					{ start: 10, end: 20 },
					{ start: 30, end: 40 },
				],
				content: {},
			},
		]
		// First, just to a validation, to make sure it's okay:
		validateTimeline(timeline, true)

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = getResolvedState(resolvedTimeline, 5)
		expect(state0.layers['0']).toBeFalsy()

		const state1 = getResolvedState(resolvedTimeline, 15)
		expect(state1).toMatchObject({
			layers: {
				'0': { id: 'video' },
			},
			nextEvents: [
				{ time: 20, type: EventType.END, objId: 'video' },
				{ time: 30, type: EventType.START, objId: 'video' },
				{ time: 40, type: EventType.END, objId: 'video' },
			],
		})
	})
	test('Repeating - capped by parent', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'group0',
				enable: {
					start: 0, // 0-null
				},
				layer: '',
				content: {},
				classes: [],
				isGroup: true,
				children: [
					{
						id: 'group1',
						enable: {
							start: 0,
							end: 2718,
						},
						layer: 'layer2',
						content: {},
						classes: [],
						isGroup: true,
						children: [
							{
								id: 'group2',
								enable: {
									start: 0,
									duration: 15000,
									repeating: 15000,

									// 0-15000, 15000-30000
									// capped to: 0-2718
								},
								layer: '',
								content: {},
								classes: [],
								isGroup: true,
								children: [
									{
										id: 'AAA',
										enable: {
											start: 0,
											duration: 3000,
											// 0-3000, 15000-18000
											// capped to: 0-2718
										},
										layer: 'layer1',
										content: {},
										classes: [],
									},
								],
							},
						],
					},
				],
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		const obj = resolvedTimeline.objects['AAA']

		expect(obj).toBeTruthy()
		expect(obj.resolved.instances).toHaveLength(1)
	})

	test('Basic conflict', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'A',
				layer: '0',
				enable: { start: 0, end: 100 },
				content: {},
			},
			{
				id: 'B',
				layer: '0',
				enable: { start: 20, end: 50 },
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)
		expect(resolvedTimeline.objects['A'].resolved.instances).toMatchObject([
			{ start: 0, end: 20 },
			{ start: 50, end: 100 },
		])
		expect(resolvedTimeline.objects['B'].resolved.instances).toMatchObject([{ start: 20, end: 50 }])
	})
	test('Reference conflicted object', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'A',
				layer: '0',
				enable: { start: 0, end: 100 },
				content: {},
			},
			{
				id: 'B',
				layer: '0',
				enable: { start: 20, end: 50 },
				content: {},
			},
			{
				id: 'C',
				layer: '0',
				enable: { start: 40, end: 60 },
				content: {},
			},
			{
				id: 'refA',
				layer: '1',
				enable: {
					while: '#A+1',
				},
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['A'].resolved.instances).toMatchObject([
			{ start: 0, end: 20 },
			{ start: 60, end: 100 },
		])
		expect(resolvedTimeline.objects['B'].resolved.instances).toMatchObject([{ start: 20, end: 40 }])
		expect(resolvedTimeline.objects['C'].resolved.instances).toMatchObject([{ start: 40, end: 60 }])
		expect(resolvedTimeline.objects['refA'].resolved.instances).toMatchObject([
			{ start: 1, end: 21 },
			{ start: 61, end: 101 },
		])
	})
	test('Reference conflicted object via class', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'A',
				layer: '0',
				enable: { start: 0, end: 100 },
				content: {},
				classes: ['AClass'],
			},
			{
				id: 'B',
				layer: '0',
				enable: { start: 20, end: 50 },
				content: {},
			},
			{
				id: 'C',
				layer: '0',
				enable: { start: 40, end: 60 },
				content: {},
			},
			{
				id: 'refA',
				layer: '1',
				enable: {
					while: '.AClass+1',
				},
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['A'].resolved.instances).toMatchObject([
			{ start: 0, end: 20 },
			{ start: 60, end: 100 },
		])
		expect(resolvedTimeline.objects['B'].resolved.instances).toMatchObject([{ start: 20, end: 40 }])
		expect(resolvedTimeline.objects['C'].resolved.instances).toMatchObject([{ start: 40, end: 60 }])
		expect(baseInstances(resolvedTimeline.objects['refA'].resolved.instances)).toMatchObject([
			{ start: 1, end: 21 },
			{ start: 61, end: 101 },
		])
	})

	test('Group reference conflicted object', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'A',
				layer: '0',
				enable: { start: 10, end: 100 },
				content: {},
			},
			{
				id: 'B',
				layer: '0',
				enable: { start: 20, end: 50 },
				content: {},
			},
			{
				id: 'group0',
				layer: '1',
				enable: {
					while: '#A+1', // 11-101 (11-21, 51-101)
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '2',
						enable: {
							start: 1, // 12-101 (12-21, 52-101)
						},
						content: {},
						isGroup: true,
						children: [
							{
								id: 'child0_0',
								layer: '3',
								enable: {
									start: 1, // 13-101
								},
								content: {},
							},
						],
					},
				],
			},
			{
				id: 'ref_child0_0',
				layer: '',
				enable: { while: '#child0_0' },
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['A'].resolved.instances).toMatchObject([
			{ start: 10, end: 20, originalStart: 10 },
			{ start: 50, end: 100, originalStart: 10 },
		])
		expect(resolvedTimeline.objects['B'].resolved.instances).toMatchObject([{ start: 20, end: 50 }])
		expect(baseInstances(resolvedTimeline.objects['group0'].resolved.instances)).toMatchObject([
			{ start: 11, end: 21 },
			{ start: 51, end: 101 },
		])
		expect(baseInstances(resolvedTimeline.objects['child0'].resolved.instances)).toMatchObject([
			{ start: 12, end: 21 },
			{ start: 52, end: 101 },
		])
		expect(baseInstances(resolvedTimeline.objects['child0_0'].resolved.instances)).toMatchObject([
			{ start: 13, end: 21 },
			{ start: 53, end: 101 },
		])
		expect(baseInstances(resolvedTimeline.objects['ref_child0_0'].resolved.instances)).toMatchObject([
			{ start: 13, end: 21 },
			{ start: 53, end: 101 },
		])
	})

	test('Debug mode', () => {
		// Just run in debug mode, to see that it doesn't crash and improve code coverage numbers.

		const orgConsoleLog = console.log
		const mockConsoleLog = jest.fn()
		console.log = mockConsoleLog

		const timeline: Array<TimelineObject> = [
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
					start: '#video.start + 10',
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10',
					duration: 15,
				},
				content: {},
			},
		]

		const options: ResolveOptions = {
			time: 0,
			debug: true,
			cache: {},
		}
		// Resolve the timeline
		const resolvedTimeline = resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		getResolvedState(resolvedTimeline, 15)

		// resolve again, to use cache:
		resolveTimeline(timeline, options)

		expect(mockConsoleLog).toHaveBeenCalled()
		expect(mockConsoleLog.mock.calls.length).toBeGreaterThan(10)

		// restore:
		console.log = orgConsoleLog
	})

	test('applyKeyframeContent', () => {
		const parentContent = {
			parent: 1,
			obj: {
				parent: 1,
				override: 1,
			},
		}
		applyKeyframeContent(parentContent, {
			keyframe: 9,
			obj: {
				keyframe: 9,
				override: 9,
			},
		})
		expect(parentContent).toEqual({
			parent: 1,
			keyframe: 9,
			obj: {
				parent: 1,
				keyframe: 9,
				override: 9,
			},
		})
	})

	test('Cache', () => {
		const timeline0: TimelineObject[] = [
			{
				id: 'bg',
				enable: {
					while: 1,
				},
				layer: 'layerA',
				content: {},
			},
			{
				id: 'group0',
				enable: {
					start: 10000,
				},
				layer: '',
				content: {},
				children: [
					{
						id: 'child0',
						enable: {
							start: 5000, // 15000
							end: null,
						},
						layer: 'layerA',
						content: {},
					},
				],
				isGroup: true,
			},
			{
				id: 'bg2',
				enable: {
					while: '#bg',
				},
				layer: 'layerB',
				content: {},
				priority: 1,
			},
			{
				id: 'bg3',
				enable: {
					while: 1,
				},
				layer: 'layerB',
				content: {},
				priority: 0,
			},
		]

		const timeline1 = clone(timeline0)

		// Nudge "group0" a little bit, this should cause "child0" to be resolved differently, which in turn affects "bg" via collision
		timeline1[1].enable = {
			start: 10001,
		}

		const cache = {}

		resolveTimeline(timeline0, { cache: cache, time: 0 })

		const rtl1NoCache = resolveTimeline(timeline1, { time: 0 })
		const rtl1 = resolveTimeline(timeline1, { cache: cache, time: 0 })

		const state1NoCache = getResolvedState(rtl1NoCache, 10)
		const state1 = getResolvedState(rtl1, 10)

		// cache and no-cache should render the same result
		expect(state1NoCache.layers['layerA']).toBeTruthy()

		// "bg" should have changed, since that is affected by a collision with "child0"
		expect(rtl1.objects['bg'].resolved.instances).toMatchObject([
			{
				start: 0,
				end: 15001,
			},
		])
		// "bg2" should have changed, since that is affected by the change to "bg"
		expect(rtl1.objects['bg2'].resolved.instances).toMatchObject([
			{
				start: 0,
				end: 15001,
			},
		])
		// "bg3" should have changed, since that is affected by a collision with "bg2"
		expect(rtl1.objects['bg3'].resolved.instances).toMatchObject([
			{
				start: 15001,
				end: null,
			},
		])

		expect(state1.layers['layerA']).toEqual(state1NoCache.layers['layerA'])
	})
})
