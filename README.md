# SuperFly-Timeline

[![Node CI](https://github.com/SuperFlyTV/supertimeline/actions/workflows/node.yml/badge.svg)](https://github.com/SuperFlyTV/supertimeline/actions/workflows/node.yml)
[![codecov](https://codecov.io/gh/SuperFlyTV/supertimeline/branch/master/graph/badge.svg)](https://codecov.io/gh/SuperFlyTV/supertimeline)
[![npm](https://img.shields.io/npm/v/superfly-timeline)](https://www.npmjs.com/package/superfly-timeline)

The **SuperFly-Timeline** library resolves a **Timeline**, ie calculates absolute times of the Timeline-objects, based on their relationships expressed in time-based logic expressions.

## What is a Timeline?

**Timeline-objects** can be placed on a **Timeline** and their position on that timeline can be expressed as either absolute times (`{start: 100, end: 150}`) or relative to other objects (`{start: "#otherObjId.start", duration: 10}`).

Timeline-objects can be placed on **layers**, where only one object will become active at a time.

Timeline-objects can have **classes**, which can be referenced by other objects.

Timeline-objects can have **child objects**, which are capped inside of their parents.

### Examples

_Note: These examples are simplified and assumes that the time-base is in seconds, however you can choose whatever timebase you want in your implementation._

- `{start: "#A.start + 10"}`:
  Will start 10 seconds after `A` started. Continues indefinitely.
- `{start: "(#A.start + #A.end) / 2", duration: 8}`:
  Will start halvway into `A`. Plays for 8 seconds.
- `{while: "#A"}`:
  Will play whenever `A` plays.
- `{while: "#A - 2"}`:
  Will play whenever `A` plays, and starts 2 seconds before `A`.
- `{while: ".mainOutput"}`:
  Will play whenever anything with the class `"mainOutput"` plays.
- `{while: "!.mainOutput"}`:
  Will play whenever there's not nothing playing with the class.

SuperFly-Timeline is mainly used in the [**Sofie** TV News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/) and [SuperConductor](https://github.com/SuperFlyTV/SuperConductor).

## Installation

### NodeJS

`$ npm install --save superfly-timeline`

### Web browser

Can be run in the browser using _browserify_ or the like.

## Getting started

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/rztp517u/)

```typescript
import {
	TimelineObject,
	ResolveOptions,
	resolveTimeline,
	getResolvedState,
	ResolvedTimelineObjectInstance,
	TimelineState,
} from 'superfly-timeline'

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
		classes: ['video'],
	},
	{
		// This object defines a graphic template, to be overlaid on the video:
		id: 'graphic0',
		layer: 'gfxOverlay',
		enable: {
			start: '#video0.start + 5', // 5 seconds after video0 starts
			duration: 8,
		},
		content: {},
	},
	// This object defines a graphic template, to played just before the video ends:
	{
		id: 'graphic1',
		layer: 'gfxOverlay',
		enable: {
			start: '#video0.end - 2', // 2 seconds before video0 ends
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
]

// When we have a new timeline, the first thing to do is to "resolve" it.
// This calculates all timings of the objects in the timeline.
const options: ResolveOptions = {
	time: 0,
}
const resolvedTimeline = resolveTimeline(myTimeline, options)

function logState(state: TimelineState) {
	console.log(
		`At the time ${state.time}, the active objects are ${Object.entries<ResolvedTimelineObjectInstance>(state.layers)
			.map(([l, o]) => `"${o.id}" at layer "${l}"`)
			.join(', ')}`
	)
}
// Check the state at time 15:
logState(getResolvedState(resolvedTimeline, 15))

// Check the state at time 50:
const state = getResolvedState(resolvedTimeline, 50)
logState(state)

// Check the next event to happen after time 50:
const nextEvent = state.nextEvents[0]
console.log(`After the time ${state.time}, the next event to happen will be at time ${nextEvent.time}."`)
console.log(`The next event is related to the object "${nextEvent.objId}"`)

// Check the state at time 99:
logState(getResolvedState(resolvedTimeline, 99))

// Check the state at time 200:
logState(getResolvedState(resolvedTimeline, 200))

console.log(
	`The object "videoBGLoop" will play at [${resolvedTimeline.objects['videoBGLoop'].resolved.instances
		.map((instance) => `${instance.start} to ${instance.end === null ? 'infinity' : instance.end}`)
		.join(', ')}]`
)

// Console output:
// At the time 15, the active objects are "video0" at layer "videoPlayer", "graphic0" at layer "gfxOverlay"
// At the time 50, the active objects are "video0" at layer "videoPlayer"
// After the time 50, the next event to happen will be at time 98."
// The next event is related to the object "graphic1"
// At the time 99, the active objects are "video0" at layer "videoPlayer", "graphic1" at layer "gfxOverlay"
// At the time 200, the active objects are "videoBGLoop" at layer "videoPlayer"
// The object "videoBGLoop" will play at [0 to 10, 100 to infinity]
```

# API

The logic is set by setting properties in the `.enable` property.

| Property     | Description                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `.start`     | The start time of the object. (cannot be combined with `.while`)                                                                         |
| `.end`       | The end time of the object (cannot be combined with `.while` or `.duration`).                                                            |
| `.while`     | Enables the object WHILE expression is true (ie sets both the start and end). (cannot be combined with `.start`, `.end` or `.duration` ) |
| `.duration`  | The duration of an object                                                                                                                |
| `.repeating` | Makes the object repeat with given interval                                                                                              |

Note: If neither of `.end`, `.duration` or `.while` are set, the object will continue indefinitely.

**Examples**

```javascript
{
   enable: {
      start: '#abc.end + 5', // Start 5 seconds after #abc ends
      duration: '#abc.duration' // Have the same duration as #abc
   }
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/kq6wfcov/)

```javascript
{
   enable: {
      while: '#abc', // Enable while #abc is enabled
   }
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/qjw7hL5x/)

## State & Layers

All objects will be on a **layer** in the resolved **state**. There are a few rules:

- Only **one** object can exist on a layer at the same time.
- If two (or more) objects conflicts, ie fight for the place on a layer:
  - The one with highest `.priority` will win.
  - If tied, the one with _latest start time_ will win.

**Example**

```javascript
{
	id: 'A',
	layer: 'L1',
	enable: { start: 10, end: 100 },
	content: {},
},
{
	id: 'B',
	layer: 'L1',
	enable: { start: 50, duration: 10 },
	content: {},
}
// This will cause the timeline to be:
// A on layer L1 for 10 - 50
// B on layer L1 for 50 - 60
// A on layer L1 for 60 - 100

```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/excb84ky/)

## References

### Reference types

| Reference    | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `#objId`     | Reference to the object that has the specified **.id**              |
| `.className` | Reference to any object that has the class-name in its **.classes** |
| `$layerName` | Reference to any object that is on the specified layer (**.layer**) |

### Reference modifiers

The references listed above can be modified:
| Example | Description |
|--|--|
| `#objId.start` | Refer to the start of the object |
| `#objId.end` | Refer to the end of the object |
| `#objId.duration` | Refer to the duration of the object |

### Reference combinations

The references can be combined using arithmetic (`+ - \* / % ( )`) and boolean operators (`& | ! `)

**Examples**

```javascript
{
	// Start halfway in:
	enable: {
		start: '#abc.start + #abc.duration / 2'
	}
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/2jmsgu6h/)

```javascript
{ // Enable while #sun and #moon, but not #jupiter:
   enable: { while: '#sun & #moon & !#jupiter',  }
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/nuobkgdw/)

---

## Keyframes

It is also possible to add keyframes to an object. A keyframe follows the same logic as other timeline-objects and can reference (and be referenced) as such.

When the keyframe is active, its content is deeply applied onto the parents `.content` in the `ResolvedState`.

**Example**

```javascript
const tl = {
	id: 'myObj',
	layer: 'L1',
	enable: {
		start: 10,
		end: 100,
	},
	content: {
		opacity: 100,
	},
	keyframes: [
		{
			id: 'kf0',
			enable: {
				start: 5, // relative to parent, so will start at 15
				duration: 10,
			},
			content: {
				opacity: 0,
			},
		},
	],
}
// This will cause the object to
// * Be active at 10 - 100
// * Have opacity = 100 at 10 - 15
// * Have opacity = 0   at 15 - 25
// * Have opacity = 100 at 25 - 100
```

## Groups

It is also possible to add groups that contain other objects as children. The children will always be capped within their parent.

Groups can work in 2 ways:

- A _"Transparent group"_ **does not** have a `.layer` assigned to it (or it's set to ''). A transparent group does not "collide" with other objects, nor be visible in the calculated state. But its children objects will always be put on the timeline.
- A _"Normal group"_ **does** have a `.layer` assigned to it. This means that the group works the same way as normal objects, and can collide with them. The children of the group will only be enabled while the parent is enabled.

**Example**

```javascript
{
	id: 'myGroup',
	layer: '',
	enable: {
		start: 10,
		duration: 10,
		repeat: 20 // Repeat every 20 seconds, so will start at 10, 30, 50 etc...
	},
	content: {},
	isGroup: true,
	children: [{
		id: 'child0',
		layer: 'L1',
		enable: {
			start: 2, // Will repeat with parent, so will start at 12, 32, 52 etc...
			duration: null // Duration not set, but will be capped within parent, so will end at 20, 40, 60 etc...
		},
		content: {},
	}]

}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/ydznup0k/)

---

Please note that in the examples above the times have been defined in seconds.
This is for readability only, you may use whatever time-base you like (like milliseconds) in your implementation.

## Changelog and Breaking changes

See [CHANGELOG.md](./CHANGELOG.md)

For notes on breaking changes, see [MIGRATION.md](./MIGRATION.md)
