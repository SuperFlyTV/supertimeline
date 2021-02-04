import * as _ from 'underscore'
import * as Timeline from '../dist' // 'superfly-timeline'

// The input to the timeline is an array of objects:
const myTimeline: Array<Timeline.TimelineObject> = [
	{
		// This object represents a video, starting at time "10" and ending at time "100"
		id: 'video0',
		layer: 'L1',
		enable: {
			start: 10,
			end: 100,
		},
		content: {},
	},
	{
		// This object defines a graphic, to be overlaid on the video
		id: 'graphic0',
		layer: 'L2',
		enable: {
			start: '#video0.start + 10', // 10 after video0 starts
			duration: 10,
		},
		content: {},
		classes: ['graphics'],
	},
	{
		id: 'graphic1',
		layer: 'L2',
		enable: {
			start: '#graphic0.end + 10', // 10 after graphic0 ends
			duration: 15,
		},
		content: {},
		classes: ['graphics'],
	},
	{
		id: 'graphicBackground',
		layer: 'L3',
		enable: {
			while: '!.graphics', // When no graphics are playing
		},
		content: {},
	},
]

// When we have a new timeline, the first thing to do is to "Resolve" it.
// This calculates all timings of the objects in the timeline.
const options: Timeline.ResolveOptions = {
	time: 0,
}
const resolvedTimeline = Timeline.Resolver.resolveTimeline(myTimeline, options)

// Use the resolved timeline and pre-calculate states, instance collisions, etc..
const resolvedStates = Timeline.Resolver.resolveAllStates(resolvedTimeline)

// Fetch the state at time 10:
const state0 = Timeline.Resolver.getState(resolvedStates, 10)
console.log(
	`At the time ${state0.time}, the active objects are "${_.map(state0.layers, (o, l) => `${o.id} at layer ${l}`).join(
		', '
	)}"`
)

// Fetch the state at time 25:
const state1 = Timeline.Resolver.getState(resolvedStates, 25)
console.log(
	`At the time ${state1.time}, the active objects are "${_.map(state1.layers, (o, l) => `${o.id} at layer ${l}`).join(
		', '
	)}"`
)

console.log(
	`The object "graphicBackground" will play at [${_.map(
		resolvedStates.objects['graphicBackground'].resolved.instances,
		(instance) => `${instance.start} to ${instance.end}`
	).join(', ')}]`
)

const nextEvent = state1.nextEvents[0]
console.log(
	`After the time ${state1.time}, the next event to happen will be at time ${nextEvent.time}. The event is related to the object "${nextEvent.objId}"`
)

// Output:
// At the time 10, the active objects are "video0 at layer L1, graphicBackground at layer L3"
// At the time 25, the active objects are "video0 at layer L1, graphic0 at layer L2"
// The object "graphicBackground" will play at "0 to 20, 30 to 40, 55 to null"
// After the time 25, the next event to happen will be at time 30. The event is related to the object "graphic0"
