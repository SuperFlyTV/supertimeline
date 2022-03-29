# SuperFly-Timeline

[![Node CI](https://github.com/SuperFlyTV/supertimeline/actions/workflows/node.yml/badge.svg)](https://github.com/SuperFlyTV/supertimeline/actions/workflows/node.yml)
[![codecov](https://codecov.io/gh/SuperFlyTV/supertimeline/branch/master/graph/badge.svg)](https://codecov.io/gh/SuperFlyTV/supertimeline)
[![npm](https://img.shields.io/npm/v/superfly-timeline)](https://www.npmjs.com/package/superfly-timeline)

The SuperFly-Timeline is a collection of rules as well as a resolver for placing objects on a virtual timeline. It uses the concept of timing objects in sequences -– absolute or relative timings -– which resolves recursively in nested structures. This means it supports grouping, combinations of timing between groups, and objects within groups. It also supports logical conditions instead of timed conditions.

It is used in the [**Sofie** TV News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/).

## Installation

### NodeJS

`$ npm install --save superfly-timeline`

### Web browser

Can be run in the browser using _browserify_ or the like.

## Getting started

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/rztp517u/)

```javascript
var Timeline = require('superfly-timeline')

// The input to the timeline is an array of objects:
const myTimeline = [
	{
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
const options = {
	time: 0,
}
const resolvedTimeline = Timeline.Resolver.resolveTimeline(myTimeline, options)

// Use the resolved timeline and pre-calculate states, instance collisions, etc.
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
		resolvedTimeline.objects['graphicBackground'].resolved.instances,
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

If `.end`, `.duration` or `.while` is not set, the object will run indefinitely.

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

All objects will be resolved to a **layer** in the calculated **state**. There are a few rules:

- Only **one** object can exist on a layer at the same time.
- If two (or more) objects fight for the place on a layer:
  - The one with highest `.priority` will win.
  - If tied, the one with _latest start time_ will win.

**Example**

```javascript
{
	id: 'A',
	layer: 'L1',
	enable: {
		start: 10,
		end: 100
	},
	content: {},
},
{
	id: 'B',
	layer: 'L1',
	enable: {
		start: 50,
		end: 10
	},
	content: {},
}
// This will cause the timeline to be:
// A on layer L1 for 10 - 50
// B on layer L1 for 50 - 60
// A on layer L1 for 60 - 100 (since B has stopped)

```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/excb84ky/)

## References

### Reference types

| Example      | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `#objId`     | Reference to the object that has the specified **.id**              |
| `.className` | Reference to any object that has the class-name in its **.classes** |
| `$layerName` | Reference to any object that is on the specified layer (**.layer**) |

#### Reference modifiers

The references listed above can be modified:
| Example | Description |
|--|--|
| #objId.start | Refer to the start of the object |
| #objId.end| Refer to the end of the object |
| #objId.duration | Refer to the duration of the object |

### Reference combinations

The references can be combined using basic math expressions ( + - \* / % ) and logical operators ( & | ! )

**Examples**

```javascript
{
   enable: {
      start: '#abc.start + #abc.duration / 2', // Start halfway in
   }
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/2jmsgu6h/)

```javascript
{
   enable: {
      while: '#sun & #moon & !#jupiter', // Enable while #sun and #moon, but not #jupiter
   }
}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/nuobkgdw/)

---

## Keyframes

It is also possible to add keyframes to an object. A keyframe can have the same logics as normal timeline objects, and when "enabled", it applies it's `.content` on its parent object's `.content`.
**Example**

```javascript
{
	id: 'myObj',
	layer: 'L1',
	enable: {
		start: 10,
		end: 100
	},
	content: {
		opacity: 100
	},
	keyframes: [{
		id:  'kf0',
		enable: {
			start: 5, // relative to parent, so will start at 15
			duration: 10
		},
		content: {
			opacity: 0
		}
	}]
}
// This will cause the object to be
// * Enabled between 10 - 100
// * Have opacity = 100 between 10 - 15, and 25 - 100
// * Have opacity = 0 between 15 - 25
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
			start: 2, // will repeat with parent, so will start at 12, 32, 52 etc...
			duration: null // Duration not set, but will be capped in parent, so will end at 20, 40, 60 etc...
		},
		content: {},
	}]

}
```

[Try it in JSFiddle!](https://jsfiddle.net/nytamin/ydznup0k/)

---

Please note that in the examples above the times have been defined in seconds.
This is for readability only, you may use whatever time-base you like (like milliseconds) in your implementation.
