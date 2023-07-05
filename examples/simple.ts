import { TimelineObject, ResolveOptions, resolveTimeline, getResolvedState } from '..' // 'superfly-timeline'

// The input to the timeline is an array of objects:
const myTimeline: TimelineObject[] = [
	{
		// This object represents a video, starting at time "10" and ending at time "100"
		id: 'video0',
		layer: 'videoPlayer',
		enable: {
			start: 10,
			end: 100,
		},
		content: {},
	},
	{
		// This object defines a graphic template, to be overlaid on the video
		id: 'graphic0',
		layer: 'gfxOverlay',
		enable: {
			start: '#video0.start + 10', // 10 after video0 starts
			duration: 10,
		},
		content: {},
		classes: ['graphics'],
	},
	{
		id: 'graphic1',
		layer: 'gfxOverlay',
		enable: {
			start: '#graphic0.end + 10', // 10 after graphic0 ends
			duration: 15,
		},
		content: {},
		classes: ['graphics'],
	},
	{
		id: 'graphicIdle',
		layer: 'gfxOverlay',
		enable: {
			while: '!.graphics', // When no graphics are playing
		},
		content: {},
	},
]

// When we have a new timeline, the first thing to do is to "Resolve" it.
// This calculates all timings of the objects in the timeline.
const options: ResolveOptions = {
	time: 0,
}
const resolvedTimeline = resolveTimeline(myTimeline, options)

// Fetch the state at time 10:
const state0 = getResolvedState(resolvedTimeline, 10)
console.log(
	`At the time ${state0.time}, the active objects are ${Object.entries(state0.layers)
		.map(([l, o]) => `"${o.id}" at layer "${l}"`)
		.join(', ')}`
)

// Fetch the state at time 25:
const state1 = getResolvedState(resolvedTimeline, 25)
console.log(
	`At the time ${state1.time}, the active objects are ${Object.entries(state1.layers)
		.map(([l, o]) => `"${o.id}" at layer "${l}"`)
		.join(', ')}`
)

console.log(
	`The object "graphicIdle" will play at [${resolvedTimeline.objects['graphicIdle'].resolved.instances
		.map((instance) => `${instance.start} to ${instance.end === null ? 'infinity' : instance.end}`)
		.join(', ')}]`
)

const nextEvent = state1.nextEvents[0]
console.log(`After the time ${state1.time}, the next event to happen will be at time ${nextEvent.time}."`)
console.log(`The next event is related to the object "${nextEvent.objId}"`)

// Output:
// At the time 10, the active objects are "video0" at layer "videoPlayer", "graphicIdle" at layer "gfxOverlay"
// At the time 25, the active objects are "video0" at layer "videoPlayer", "graphic0" at layer "gfxOverlay"
// The object "graphicIdle" will play at [0 to 20, 30 to 40, 55 to infinity]
// After the time 25, the next event to happen will be at time 30."
// The next event is related to the object "graphic0"
