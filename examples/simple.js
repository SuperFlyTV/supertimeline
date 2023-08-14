"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require(".."); // 'superfly-timeline'
// The input to the timeline is an array of objects:
const myTimeline = [
    {
        // This object represents a video, starting at time "10" and ending at time "100"
        id: 'video0',
        layer: 'videoPlayer',
        enable: {
            start: 10,
            end: 100,
        },
        content: {},
        classes: ['video'],
    },
    {
        // This object defines a graphic template, to be overlaid on the video:
        id: 'graphic0',
        layer: 'gfxOverlay',
        enable: {
            start: '#video0.start + 5',
            duration: 8,
        },
        content: {},
    },
    // This object defines a graphic template, to played just before the video ends:
    {
        id: 'graphic1',
        layer: 'gfxOverlay',
        enable: {
            start: '#video0.end - 2',
            duration: 5,
        },
        content: {},
    },
    // A background video loop, to play while no video is playing:
    {
        id: 'videoBGLoop',
        layer: 'videoPlayer',
        enable: {
            while: '!.video', // When nothing with the class "video" is playing
        },
        content: {},
    },
];
// When we have a new timeline, the first thing to do is to "resolve" it.
// This calculates all timings of the objects in the timeline.
const options = {
    time: 0,
};
const resolvedTimeline = (0, __1.resolveTimeline)(myTimeline, options);
function logState(state) {
    console.log(`At the time ${state.time}, the active objects are ${Object.entries(state.layers)
        .map(([l, o]) => `"${o.id}" at layer "${l}"`)
        .join(', ')}`);
}
// Note: A "State" is a moment in time, containing all objects that are active at that time.
{
    // Check the state at time 15:
    const state = (0, __1.getResolvedState)(resolvedTimeline, 15);
    logState(state);
}
{
    // Check the state at time 50:
    const state = (0, __1.getResolvedState)(resolvedTimeline, 50);
    logState(state);
    // Check the next event to happen after time 50:
    const nextEvent = state.nextEvents[0];
    console.log(`After the time ${state.time}, the next event to happen will be at time ${nextEvent.time}."`);
    console.log(`The next event is related to the object "${nextEvent.objId}"`);
}
{
    // Check the state at time 99:
    const state = (0, __1.getResolvedState)(resolvedTimeline, 99);
    logState(state);
}
{
    // Check the state at time 200:
    const state = (0, __1.getResolvedState)(resolvedTimeline, 200);
    logState(state);
}
console.log(`The object "videoBGLoop" will play at [${resolvedTimeline.objects['videoBGLoop'].resolved.instances
    .map((instance) => `${instance.start} to ${instance.end === null ? 'infinity' : instance.end}`)
    .join(', ')}]`);
// Console output:
// At the time 15, the active objects are "video0" at layer "videoPlayer", "graphic0" at layer "gfxOverlay"
// At the time 50, the active objects are "video0" at layer "videoPlayer"
// After the time 50, the next event to happen will be at time 98."
// The next event is related to the object "graphic1"
// At the time 99, the active objects are "video0" at layer "videoPlayer", "graphic1" at layer "gfxOverlay"
// At the time 200, the active objects are "videoBGLoop" at layer "videoPlayer"
// The object "videoBGLoop" will play at [0 to 10, 100 to infinity]
