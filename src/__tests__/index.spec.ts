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

	test('parenthesis with negation', () => {
		const timeline: Array<TimelineObject> = [
			{

				id: 'sun',
				layer: 'sun',
				enable: {
				  start: 40,
				  end: 100
				},
				content: {}
			  },
			  {
				id: 'moon',
				layer: 'moon',
				enable: {
				  start: 10,
				  end: 80
				},
				content: {}
			  },
			  {
				id: 'jupiter',
				layer: 'jupiter',
				enable: {
				  start: 60,
				  end: 130
				},
				content: {}
			  },
			  {
				id: 'myObject',
				layer: 'L1',
				enable: {
				  while: '#sun & !(#moon | #jupiter ) ', // Enable while #sun (but not #moon or #jupiter) are enabled.
				},
				content: {}
			  }
		]

		const options: ResolveOptions = {
			time: 0
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)

		expect(resolvedTimeline.objects['myObject'].resolved.instances).toMatchObject([
			{ start: 60, end: 80 }
		])
	})
})
