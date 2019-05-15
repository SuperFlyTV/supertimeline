import {
	TimelineObject,
	Resolver,
	ResolveOptions,
	EventType,
	validateObject,
	validateTimeline
} from '../index'

describe('index', () => {
	test('resolve timeline', () => {
		const timeline: Array<TimelineObject> = [
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
					start: '#video.start + 10',
					duration: 10
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10',
					duration: 15
				},
				content: {}
			}
		]
		// First, just to a validation, to make sure it's okay:
		validateTimeline(timeline, true)

		// Example on how to validate a single object:
		validateObject(timeline[0], true)

		const options: ResolveOptions = {
			time: 0
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedTimeline, 15)

		expect(state0).toMatchObject({
			layers: {
				'0': { id: 'video' },
				'1': { id: 'graphic0' }
			},
			nextEvents: [
				{ time: 20, type: EventType.END, objId: 'graphic0' },
				{ time: 30, type: EventType.START, objId: 'graphic1' },
				{ time: 45, type: EventType.END, objId: 'graphic1' },
				{ time: 100, type: EventType.END, objId: 'video' }
			]
		})
	})
	test('id:s should be consistent', () => {
		const timeline: Array<TimelineObject> = [
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
					while: '!#video.start'
				},
				content: {},
				keyframes: [{
					id: 'kf0',
					enable: {
						start: 2,
						duration: 2,
						repeating: 10
					},
					content: {}
				}]
			}
		]

		const options: ResolveOptions = {
			time: 0
		}
		// Resolve the timeline
		const resolvedTimeline0 = Resolver.resolveTimeline(timeline, options)
		const resolvedTimeline1 = Resolver.resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedTimeline0, 15)
		const state1 = Resolver.getState(resolvedTimeline1, 15)

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
					end: 100
				},
				content: {
					attr1: 0,
					attr2: 0
				},
				keyframes: [{
					id: 'kf0',
					enable: {
						start: 5,
						end: 20
					},
					content: {
						attr2: 1,
						attr3: 1
					}
				}]
			}
		]

		const options: ResolveOptions = {
			time: 0
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedTimeline, 4)
		const state1 = Resolver.getState(resolvedTimeline, 15)
		const state2 = Resolver.getState(resolvedTimeline, 21)

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
	test('class applies when defined multiple places', () => {
		const timeline: Array<TimelineObject> = [
			{
			   'id': 'o1',
			   'enable': {
				  'while': '.some_class'
			   },
			   'priority': 1,
			   'layer': 'layer0',
			   'content': {}
			},
			{
			   'id': 'o5',
			   'priority': 0.1,
			   'enable': {
				  'start': 1
			   },
			   'layer': 'layer1',
			   'classes': [
				  'some_class'
			   ],
			   'content': {}
			},
			{
			   'id': 'g0',
			   'enable': {
				  'start': 500,
				  'end': 1000
			   },
			   'priority': -1,
			   'layer': '',
			   'content': {},
			   'children': [
				{
					'id': 'bad0',
					'priority': 0,
					'enable': {
						'start': 0
					},
					'layer': 'layer1',
					'classes': [
						'some_class'
					],
					'content': {}
				}
			   ],
			   'isGroup': true
			}
		]

		const options: ResolveOptions = {
			time: 1500
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedTimeline, 1500)

		expect(state0.layers['layer1']).toBeTruthy()
		expect(state0.layers['layer1'].id).toEqual('o5')
		expect(state0.layers['layer0']).toBeTruthy()
		expect(state0.layers['layer0'].id).toEqual('o1')

	})
})
