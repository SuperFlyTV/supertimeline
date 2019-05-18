import {
	TimelineObject,
	Resolver,
	ResolveOptions,
	EventType,
	validateObject,
	validateTimeline
} from '../index'
import * as _ from 'underscore'

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

		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedStates, 15)

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
	test('Resolve all states', () => {
		const timeline: Array<TimelineObject> = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					end: 100
				},
				content: {},
				priority: 5
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: 50,
					end: 70
				},
				content: {},
				priority: 5
			},
			{
				id: 'video2',
				layer: '0',
				enable: {
					start: 65,
					end: 75
				},
				content: {},
				priority: 5
			},
			{
				id: 'video3',
				layer: '0',
				enable: {
					start: 50,
					end: 120
				},
				content: {},
				priority: 3 // lower prio
			}
		]

		const options: ResolveOptions = {
			time: 0
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)

		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)

		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedStates, 20)
		const state1 = Resolver.getState(resolvedStates, 60)
		const state2 = Resolver.getState(resolvedStates, 65)
		const state3 = Resolver.getState(resolvedStates, 80)
		const state4 = Resolver.getState(resolvedStates, 110)

		const state0a = Resolver.getState(resolvedTimeline, 20)
		const state1a = Resolver.getState(resolvedTimeline, 60)
		const state2a = Resolver.getState(resolvedTimeline, 65)
		const state3a = Resolver.getState(resolvedTimeline, 80)
		const state4a = Resolver.getState(resolvedTimeline, 110)

		_.each(state0.layers, (obj, layer) => { expect(obj.id).toEqual(state0a.layers[layer].id) })
		_.each(state1.layers, (obj, layer) => { expect(obj.id).toEqual(state1a.layers[layer].id) })
		_.each(state2.layers, (obj, layer) => { expect(obj.id).toEqual(state2a.layers[layer].id) })
		_.each(state3.layers, (obj, layer) => { expect(obj.id).toEqual(state3a.layers[layer].id) })
		_.each(state4.layers, (obj, layer) => { expect(obj.id).toEqual(state4a.layers[layer].id) })

		expect(state0.layers[0].id).toEqual('video0')
		expect(state1.layers[0].id).toEqual('video1')
		expect(state2.layers[0].id).toEqual('video2')
		expect(state3.layers[0].id).toEqual('video0')
		expect(state4.layers[0].id).toEqual('video3')

		expect(resolvedStates.objects['video0'].resolved.instances).toHaveLength(2)
		expect(resolvedStates.objects['video1'].resolved.instances).toHaveLength(1)
		expect(resolvedStates.objects['video2'].resolved.instances).toHaveLength(1)

		expect(resolvedStates.objects['video0'].resolved.instances[0]).toMatchObject({
			start: 0,
			end: 50
		})
		expect(resolvedStates.objects['video1'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 65
		})
		expect(resolvedStates.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 65,
			end: 75
		})
		expect(resolvedStates.objects['video0'].resolved.instances[1]).toMatchObject({
			start: 75,
			end: 100
		})
		expect(resolvedStates.objects['video3'].resolved.instances[0]).toMatchObject({
			start: 100,
			end: 120
		})
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
				  while: '#sun & !(#moon | #jupiter ) ' // Enable while #sun (but not #moon or #jupiter) are enabled.
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
