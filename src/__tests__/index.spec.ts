import {
	TimelineObject,
	ResolveOptions,
	EventType,
	validateObject,
	validateTimeline,
	resolveTimeline,
	getResolvedState,
} from '../index'
import { baseInstances } from '../resolver/lib/instance'

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
		expect(resolvedTimeline.objects['video1'].resolved.instances).toHaveLength(1)
		expect(resolvedTimeline.objects['video2'].resolved.instances).toHaveLength(1)

		expect(resolvedTimeline.objects['video0'].resolved.instances[0]).toMatchObject({
			start: 0,
			end: 50,
		})
		expect(resolvedTimeline.objects['video1'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 65,
		})
		expect(resolvedTimeline.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 65,
			end: 75,
		})
		expect(resolvedTimeline.objects['video0'].resolved.instances[1]).toMatchObject({
			start: 75,
			end: 100,
		})
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
							start: 0,
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
					start: 0,
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
})
