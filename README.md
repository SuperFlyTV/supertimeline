# SuperFly-Timeline
[![CircleCI](https://circleci.com/gh/SuperFlyTV/supertimeline.svg?style=svg)](https://circleci.com/gh/SuperFlyTV/supertimeline)

The SuperFly-Timeline is a collection of rules as well as a resolver for placing objects on a virtual timeline. It uses the concept of timing objects in sequences -– absolute or relative timings -– which resolves recursively in nested structures. This means it supports grouping, combinations of timing between groups, and objects within groups. It also supports logical conditions instead of timed conditions.

Licence: MIT

## Installation
### NodeJS

`$ npm install --save superfly-timeline`

### Web browser
Can be run in the browser using *browserify* or the like.

## Getting started

```javascript
var Timeline = require("superfly-timeline");

// The input to the timeline is an array of objects
var myObjects = [];

// Lets add an object to the timeline:
myObjects.push({
	id: 'obj0', // the id must be unique

	trigger: {
		type: Timeline.enums.TriggerType.TIME_ABSOLUTE, 
		value: Date.now()/1000 - 10 // 10 seconds ago
	},
	duration: 60, // 1 minute long
	LLayer: 1 // Logical layer
});

// Lets add another object to the timeline, set to start right after the previous one:
myObjects.push({
	id: 'obj1', // the id must be unique

	trigger: {
		type: Timeline.enums.TriggerType.TIME_RELATIVE, 
		value: '#obj0.end'
	},
	duration: 60, // 1 minute long
	LLayer: 1 // Logical layer
});

// By resolving the timeline, the times of the objects are calculated:
var tl = Timeline.resolver.getTimelineInWindow(myObjects);

// To see whats on right now, we fetch the State:
var stateNow = Timeline.resolver.getState(tl, Date.now()/1000);
//
/*
stateNow = {
	time: 1511009749,
	GLayers: { 
		'1': {
			id: 'obj0',
			trigger: {},
			duration: 60,
			LLayer: 1,
			content: {},
			resolved: {} 
		}
	},
	LLayers: {
		'1': { 
			id: 'obj0',
			trigger: {},
			duration: 60,
			LLayer: 1,
			content: {},
			resolved: {}
		}
	}
}
*/
// To see what will be on in a minute, we fetch the state for that time:
var stateInAMinute = Timeline.resolver.getState(tl, Date.now()/1000 + 60);
/*
stateNow = {
	time: 1511009749,
	GLayers: { 
		'1': {
			id: 'obj1',
			trigger: {},
			duration: 60,
			LLayer: 1,
			content: {},
			resolved: {} 
		}
	},
	LLayers: {
		'1': { 
			id: 'obj1',
			trigger: {},
			duration: 60,
			LLayer: 1,
			content: {},
			resolved: {}
		}
	}
}
*/
```

## Features

### Trigger types
* **Absolute time** (TIME_ABSOLUTE)
	The start time of the object is defined as a float number (unix time).

* **Relative time** (TIME_RELATIVE)
	The start time of the object is defined by an expression, relative to another object.
    
	Examples:
    
	**"#obj0.end"** The end time of another object
    
	**"#obj0.start"** The start time of another object
    
	**"#obj0.duration"** The duration of another object
    
	It is also possible to use basic math, using +, -, *, /, ()
    
	Examples:
    
	**"#obj0.end - 2"** 2 seconds before the end of another object
    
    **"(#obj0.start + #obj0.end) / 2 "** Half-way in

* **Logical expression** (LOGICAL)
	Use a logical expression to place an object on the timeline (unlike a time-based expression).
	When the expression is evaluated to True, the object will be present.

	Examples:
    
	**"#obj0"** Id of another object (if the other object is playing, this object will be played as well)
    
	**"$L1"** Anything on LLayer 1
    
    **"$G1"** Anything on GLayer 1
    
	**".main"** If any other object with this class is present (read more on classes below)
    
	**"#obj0 & .main"** Logical AND
    
	**"#obj0 | .main"** Logical OR
    
	**"!#obj0"** Logical NOT

#### Expressions as objects
It is also possible to define expressions as objects, as opposed to the strings explained above.
The object has a left-hand-side operand, a right-hand-side operand and an operator. The operand can be a number, a reference or another expression.

Example:

**"#obj0.end - 2"** is equivalent to
```javascript
{
	r: "#obj0.end"
	o: "-"
	l: "2"
}
```

### Layers
* **Logical layer** (LLayer): 
	If two objects are on the same LLayer, the latest (or the one with highest priority) will take precedence.

* **Graphical layer** (GLayer):
	The difference between GLayers & LLayers are that while LLayers are used first to find out WHAT to play, WHERE to play it is defined by GLayers. **(For most applications, these two will always be the same.)**

## Object reference 

| Attribute        | Description           | Examples  |
| ------------- |:-------------:| -----:|
| id | The id must be unique | 'obj0' |
| trigger.type  | See "Trigger types" above | enums.TriggerType.TIME_ABSOLUTE, TIME_RELATIVE, LOGICAL |
| trigger.value | See "Trigger types" above | For TIME_ABSOLUTE: Date.now()/1000, TIME_RELATIVE: "#obj1.end", LOGICAL: "#obj1" |
| duration | The duration of the object (0 is infinite) | 60 |
| LLayer | See "Layers" above | 1 |
| priority | Objects with higher priority will take precedence | 0 |
| classes | An array of class-names, that can be referenced from other LOGICAL objects | ['main', 'bug'] |
| disabled | Disables this object for resolving | true/false |
| content | This is where you put your specific attributes, to use later in your application | {} |
| content.keyframes | See keyframes below | [{Keyframe}] |

## Keyframes
It is possible to add keyframes to an object, which works the same way as normal objects, and their content is added to the object's.

```javascript
// example of an object with keyframes

{

	id: 'obj0',
	duration: 50,
	trigger: {
		type: Timeline.enums.TriggerType.TIME_ABSOLUTE, 
		value: 1000,
	},
	LLayer: 1,
	content: {
		media: 'AMB',
		attributes: {
			positionY: 0,
			positionX: 0,
			scale: 1
		},
		keyframes: [
			{
				id: 'K0', // id must be unique
				duration: 5, // duration of keyframe
				trigger: {
					type: Timeline.enums.TriggerType.TIME_ABSOLUTE,
					value: 5 // Abslute time means "relative to parent start time" for a keyframe
				},
				content: {
					attributes: {
						scale: 0.5
					}
				}
			},
		]
	}
}
// At the time 1000 the content will be:
/*
{
	media: 'AMB',
	attributes: {
		positionY: 0,
		positionX: 0,
		scale: 1
	}
}
// At the time 1005 (when the keyframes has started) the content will be:
/*
{
	media: 'AMB',
	attributes: {
		positionY: 0,
		positionX: 0,
		scale: 1,
		opacity: 0.5
	}
}
// At the time 1010 (when the keyframe has ended) the content will be:
/*
{
	media: 'AMB',
	attributes: {
		positionY: 0,
		positionX: 0,
		scale: 1
	}
}
*/
```

## Todo
* Add documentation for how to use *groups*
* Add more tests
