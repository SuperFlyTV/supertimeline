
import { TriggerType, EventType, TraceLevel } from '../enums/enums'
import {
	Resolver,
	TimelineResolvedObject,
	TimelineState,
	DevelopedTimeline,
	ExternalFunctions
} from '../resolver/resolver'
import * as _ from 'underscore'
// let assert = require('assert')
let clone = require('fast-clone')

let now = 1000

let testData = {
	'basic': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			classes: ['obj0Class']
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: 60, // 1 minute long
			LLayer: 1
		}
	],
	'basic2': [
		{

			id: 'obj0', // Unique id

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: '950'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'basic3': [
		{
			id: 'obj1',

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 960
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{
			id: 'obj2',

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 11 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 950
			},

			LLayer: 11, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'override': [
		{
			id: 'obj3',

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 960
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'] // used by logical expressions
		},
		{ // This should be overridden by 'obj3'
			id: 'obj4',

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 970
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'override2': [{
		id: 'obj5',

		content: {
			media: 'AMB',
			GLayer: 10 // Graphical layer
		},
		trigger: {
			type: TriggerType.TIME_ABSOLUTE,
			value: 970
		},

		LLayer: 10, // Logical layer
		priority: 1,
		classes: ['main'] // used by logical expressions
	}],
	'override3': [
		{
			id: 'obj6',

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 980
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'] // used by logical expressions
		}
	],
	'relative1': [
		{

			id: 'obj0', // Unique id

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 950
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj1', // Unique id

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end + 5 - 1'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj2', // Unique id

			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0 + (9 * 2)'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj3', // Unique id

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj2.start - 10'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj4', // Unique id

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj3.end + #obj2.duration'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj5', // Unique id

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '(#obj4.start + #obj4.end)/ 2'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'badObj0',

			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#badReference + (9 * 2)'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'relative2': [
		{

			id: 'obj0', // Unique id

			// duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 950
			},

			LLayer: 10, // Logical layer

			classes: ['myMainClass'] // used by logical expressions
		},
		{ // will be unresolved, due to referenced object doesn't have any endTime

			id: 'obj1',

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '.myMainClass.end + 5'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj2',

			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.start + 15'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'keyframes1': [
		{

			id: 'obj0', // Unique id

			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 950
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj2',

			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer

				keyframes: [
					{
						id: 'K0',
						duration: 5,
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: '1' // relative to parent start time
						},
						content: {
							mixer: {
								opacity: 0.1,
								brightness: 0.1
							}
						}
					},
					{
						id: 'K1',
						duration: 5,
						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#K0.start + 1' // relative to parent start time
						},
						content: {
							mixer: {
								opacity: 0.2
							}
						}
					},
					{
						id: 'K2',
						duration: 5,
						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#obj3.start - 1'
						},
						content: {
							mixer: {
								opacity: 0.3,
								myCustomAttribute: 1
							}
						}
					}
				]

			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.start + 15'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		},
		{

			id: 'obj3', // Unique id

			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10 // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj2.start + 20'
			},

			LLayer: 10, // Logical layer

			classes: ['main'] // used by logical expressions
		}
	],
	'abskeyframe': [
		{

			id: 'obj0',
			duration: 50,
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 1000
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
							type: TriggerType.TIME_ABSOLUTE,
							value: 5 // Abslute time means "relative to parent start time" for a keyframe
						},
						content: {
							attributes: {
								scale: 0.5,
								opacity: 0.5
							}
						}
					}
				]
			}
		}
	],
	'logical1': [
		{

			id: 'logical0',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '1'
			},
			LLayer: 2,
			content: {
			}
		},
		{
			id: 'logical1',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '#obj0 & #logical0'
			},
			LLayer: 3,
			content: {
			}
		},
		{
			id: 'logical2',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '.obj0Class | #logical0'
			},
			LLayer: 4,
			content: {
			}
		}
	],
	'logical2': [
		{

			id: 'logical0',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '$L1' // LLayer 1
			},
			LLayer: 2,
			content: {
			},
			classes: ['class0']
		},
		{
			id: 'logical1',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '!$L1' // LLayer 1
			},
			LLayer: 3,
			content: {
			}
		}
	],
	'logical3': [
		{

			id: 'logical0',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '$L1' // LLayer 1
			},
			LLayer: 2,
			content: {
			},
			classes: ['class0']
		},
		{
			id: 'logical1',
			duration: 50,
			trigger: {
				type: TriggerType.LOGICAL,
				value: '!$G1' // GLayer 1
			},
			LLayer: 3,
			content: {
			}
		}
	],
	'infiniteduration': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 0, // infinite
			LLayer: 1
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end' // will essentially never play
			},
			duration: 60, // 1 minute long
			LLayer: 1
		}
	],
	'simplegroup': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			isGroup: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 15,
						LLayer: 2
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 10,
						LLayer: 2
					}
				]
			}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#group0.end' // will essentially never play
			},
			duration: 60, // 1 minute long
			LLayer: 2
		}
	],
	'infinitegroup': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 0, // infinite duration
			LLayer: 1,
			isGroup: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 15,
						LLayer: 1
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 10,
						LLayer: 1
					}
				]
			}
		}
	],
	'logicalInGroup': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 0, // infinite duration
			LLayer: 1,
			isGroup: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.LOGICAL,
							value: '1'
						},
						LLayer: 2
					}
				]
			}
		},
		{
			id: 'outside0', // the id must be unique

			trigger: {
				type: TriggerType.LOGICAL,
				value: '1'
			},
			LLayer: 3
		}
	],
	'logicalInGroupLogical': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.LOGICAL,
				value: '1'
			},
			// duration: 0, // infinite duration
			LLayer: 1,
			isGroup: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.LOGICAL,
							value: '1'
						},
						LLayer: 2
					}
				]
			}
		},
		{
			id: 'group1', // the id must be unique

			trigger: {
				type: TriggerType.LOGICAL,
				value: '0'
			},
			// duration: 0, // infinite duration
			LLayer: 3,
			isGroup: true,
			content: {
				objects: [
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.LOGICAL,
							value: '1'
						},
						LLayer: 4
					}
				]
			}
		}
	],
	'repeatinggroup': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 63, // 63 seconds
			LLayer: 1,
			isGroup: true,
			repeating: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 15,
						LLayer: 1
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 10,
						LLayer: 1
					}
				]
			}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#group0.end' // will essentially never play
			},
			duration: 17,
			LLayer: 1
		}
	],
	'repeatinggroupinrepeatinggroup': [ // repeating group in repeating group
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 300, // 5 minutes long
			LLayer: 1,
			isGroup: true,
			repeating: true,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 30,
						LLayer: 1
					},
					{
						id: 'group1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 62, // 62 seconds
						LLayer: 1,
						isGroup: true,
						repeating: true,
						content: {
							objects: [
								{
									id: 'child1', // the id must be unique

									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 0 // Relative to parent object
									},
									duration: 10,
									LLayer: 1
								},
								{
									id: 'child2', // the id must be unique

									trigger: {
										type: TriggerType.TIME_RELATIVE,
										value: '#child1.end'
									},
									duration: 15,
									LLayer: 1
								}
							]
						}
					}
				]
			}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#group0.end' // will essentially never play
			},
			duration: 60, // 1 minute long
			LLayer: 1
		}
	]

}
let getTestData = (dataset: string) => {
	return clone(testData[dataset])
}
test('Basic timeline', () => {

	let data = getTestData('basic')

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength(2)
	expect(tl.unresolved).toHaveLength(0)

	let nextEvents = Resolver.getNextEvents(data, now - 100)

	expect(nextEvents).toHaveLength( 4)
	expect(nextEvents[0]).toMatchObject({
		type: EventType.START, time: 990, obj: {id: 'obj0'}})

	expect(nextEvents[1]).toMatchObject({
		type: EventType.END, time: 1050, obj: {id: 'obj0'}})
	expect(nextEvents[2]).toMatchObject({
		type: EventType.START, time: 1050, obj: {id: 'obj1'}})

	let state = Resolver.getState(data, now)

	expect(state.GLayers['1']).toBeTruthy() // TimelineObject
	expect(state.time).toBe( now)
	expect(state.GLayers['1'].id).toBe( 'obj0')
	expect(state.LLayers['1'].id).toBe( 'obj0')

	let state2 = Resolver.getState(tl, now)

	expect(state2.GLayers['1'].id).toBe( 'obj0')
})
test('Basic timeline 2', () => {

	let data = getTestData('basic2')

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength( 1)
	expect(tl.unresolved).toHaveLength( 0)

	let nextEvents = Resolver.getNextEvents(data, 900)
	expect(nextEvents).toHaveLength( 2)
	expect(nextEvents[0].type).toBe( EventType.START)
	expect(nextEvents[0].time).toBe( 950)
	expect(nextEvents[1].type).toBe( EventType.END)
	expect(nextEvents[1].time).toBe( 1050)

	let state = Resolver.getState(data, 1000)

	expect(state.time).toBe( 1000)
	expect(state.GLayers['10'].id).toBe( 'obj0')
	expect(state.LLayers['10'].id).toBe( 'obj0')

	let state2 = Resolver.getState(tl, 1000)

	expect(state2.GLayers['10'].id).toBe( 'obj0')
})
test('Basic timeline 3', () => {

	let data = getTestData('basic2')
		.concat(getTestData('basic3'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength( 3)
	expect(tl.unresolved).toHaveLength( 0)

	let nextEvents = Resolver.getNextEvents(tl, 1000, 1) // limit
	expect(nextEvents).toHaveLength( 1) // see that the limit is working
	expect(nextEvents[0].type).toBe( EventType.END)
	expect(nextEvents[0].time).toBe( 1050)

	let state = Resolver.getState(tl, 1000)
	expect(state.LLayers['10'].id).toBe( 'obj1')
	expect(state.LLayers['11'].id).toBe( 'obj2')
})
test('Timeline, override object', () => {

	let data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))

	let state = Resolver.getState(data, 1000)
	expect(state.LLayers['10'].id).toBe( 'obj3')
})
test('Timeline, override object 2', () => {

	let data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))
		.concat(getTestData('override2'))

	let state = Resolver.getState(data, 1000)
	expect(state.LLayers['10'].id).toBe( 'obj5')

	let stateInFuture = Resolver.getState(data, 10000)
	expect(stateInFuture.LLayers['10'].id).toBe( 'obj5')
})
test('Timeline, override object 2', () => {

	let data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))
		.concat(getTestData('override2'))
		.concat(getTestData('override3'))

	let state = Resolver.getState(data, 1000)
	expect(state.LLayers['10'].id).toBe( 'obj6')

	let stateInFuture = Resolver.getState(data, 10000)
	expect(stateInFuture.LLayers['10'].id).toBe( 'obj5')
})
test('Timeline, relative timing', () => {

	let data = getTestData('relative1')

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength( 6)
	expect(tl.unresolved).toHaveLength( 1)

	let obj1 = _.find(tl.resolved, {id: 'obj1'})
	expect(obj1).toBeTruthy() // TimelineObject
	expect(obj1.resolved.startTime).toBe( 1054)
	expect(obj1.resolved.endTime).toBe( 1064)

	let obj2 = _.find(tl.resolved, {id: 'obj2'})
	expect(obj2).toBeTruthy() // TimelineObject
	expect(obj2.resolved.startTime).toBe( 1068)
	expect(obj2.resolved.endTime).toBe( 1118)

	let obj3 = _.find(tl.resolved, {id: 'obj3'})
	expect(obj3).toBeTruthy() // TimelineObject
	expect(obj3.resolved.startTime).toBe( 1058)
	expect(obj3.resolved.endTime).toBe( 1068)

	let obj4 = _.find(tl.resolved, {id: 'obj4'})
	expect(obj4).toBeTruthy() // TimelineObject
	expect(obj4.resolved.startTime).toBe( 1118)
	expect(obj4.resolved.endTime).toBe( 1128)

	let obj5 = _.find(tl.resolved, {id: 'obj5'})
	expect(obj5).toBeTruthy() // TimelineObject
	expect(obj5.resolved.startTime).toBe( 1123)
	expect(obj5.resolved.endTime).toBe( 1133)

	let state0 = Resolver.getState(data, 1067)

	expect(state0.GLayers['10'].id).toBe( 'obj3')

	let state1 = Resolver.getState(data, 1068)

	expect(state1.GLayers['10'].id).toBe( 'obj2')

	let nextEvents = Resolver.getNextEvents(tl, 900)

	expect(nextEvents).toHaveLength( 10)

	expect(nextEvents[0]).toMatchObject({
		type: EventType.START, time: 950, obj: {id: 'obj0'}})
	expect(nextEvents[1]).toMatchObject({
		type: EventType.END, time: 1050, obj: {id: 'obj0'}})
	expect(nextEvents[2]).toMatchObject({
		type: EventType.START, time: 1054, obj: {id: 'obj1'}})
	expect(nextEvents[3]).toMatchObject({
		type: EventType.START, time: 1058, obj: {id: 'obj3'}})
	expect(nextEvents[4]).toMatchObject({
		type: EventType.END, time: 1064, obj: {id: 'obj1'}})
	expect(nextEvents[5]).toMatchObject({
		type: EventType.END, time: 1068, obj: {id: 'obj3'}})
	expect(nextEvents[6]).toMatchObject({
		type: EventType.START, time: 1068, obj: {id: 'obj2'}})
	expect(nextEvents[7]).toMatchObject({
		type: EventType.END, time: 1118, obj: {id: 'obj2'}})
	expect(nextEvents[8]).toMatchObject({
		type: EventType.START, time: 1118, obj: {id: 'obj4'}})
	expect(nextEvents[9]).toMatchObject({
		type: EventType.START, time: 1123, obj: {id: 'obj5'}})
})
test('Timeline, relative timing 2', () => {

	let data = getTestData('relative2')

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength( 2)
	expect(tl.unresolved).toHaveLength( 1)

	let obj2 = _.find(tl.resolved, {id: 'obj2'})
	expect(obj2).toBeTruthy() // TimelineObject
	expect(obj2.resolved.startTime).toBe( 965)
	expect(obj2.resolved.endTime).toBe( 1015)

	let state0 = Resolver.getState(data, 1000)

	expect(state0.GLayers['10'].id).toBe( 'obj2')

	let state1 = Resolver.getState(data, 2000)

	expect(state1.GLayers['10'].id).toBe( 'obj0')
})
test('Timeline, relative timing and keyframes', () => {

	let data = getTestData('keyframes1')

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength( 3)
	expect(tl.unresolved).toHaveLength( 0)

	let obj2 = _.find(tl.resolved, {id: 'obj2'})

	expect(obj2).toBeTruthy() // TimelineObject
	expect(obj2.resolved.startTime).toBe( 965)
	expect(obj2.resolved.endTime).toBe( 1015)

	let obj3 = _.find(tl.resolved, {id: 'obj3'})

	expect(obj3).toBeTruthy() // TimelineObject
	expect(obj3.resolved.startTime).toBe( 985)

	let nextEvents0 = Resolver.getNextEvents(data, 100)
	expect(nextEvents0).toHaveLength( 10)
	let nextEvents1 = Resolver.getNextEvents(data, 2000)
	expect(nextEvents1).toHaveLength( 0)

	let state0 = Resolver.getState(data, 966)

	let sobj2 = state0.GLayers['10']

	expect(sobj2.id).toBe( 'obj2')
	expect(sobj2.resolved.mixer.opacity).toBe( 0.1)
	expect(sobj2.resolved.mixer.brightness).toBe( 0.1)
	expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy()

	let state1 = Resolver.getState(data, 967)

	sobj2 = state1.GLayers['10']

	expect(sobj2.resolved.mixer.opacity).toBe( 0.2)
	expect(sobj2.resolved.mixer.brightness).toBe( 0.1)
	expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy()

	let state2 = Resolver.getState(data, 984)

	sobj2 = state2.GLayers['10']

	expect(sobj2.resolved.mixer.opacity).toBe( 0.3)
	expect(sobj2.resolved.mixer.myCustomAttribute).toBe( 1)
})
test('Timeline, absolute keyframe', () => {

	let data = getTestData('abskeyframe')

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength( 1)
	expect(tl.unresolved).toHaveLength( 0)

	let obj0 = _.find(tl.resolved, {id: 'obj0'})

	expect(obj0).toBeTruthy() // TimelineObject
	expect(obj0.resolved.startTime).toBe( 1000)
	expect(obj0.resolved.endTime).toBe( 1050)

	let state0 = Resolver.getState(clone(data), 1000)

	let sobj0 = state0.GLayers['1']

	expect(sobj0).toBeTruthy() // TimelineResolvedObject
	expect(sobj0.id).toBe( 'obj0')
	expect(sobj0.resolved).toBeTruthy() // TimelineResolvedObject

	expect(sobj0.resolved.attributes).toMatchObject({
		positionX: 	0,
		positionY: 	0,
		scale: 		1
	})
	expect(sobj0.resolved.attributes.opacity).toBeFalsy()

	let state1 = Resolver.getState(clone(data), 1005)

	let sobj1 = state1.GLayers['1']
	expect(sobj1).toBeTruthy() // TimelineResolvedObject
	expect(sobj1.resolved.attributes).toMatchObject({
		positionX: 	0,
		positionY: 	0,
		scale: 		0.5,
		opacity: 	0.5
	})

	let state2 = Resolver.getState(clone(data), 1010)

	let sobj2 = state2.GLayers['1']
	expect(sobj2).toBeTruthy() // TimelineResolvedObject
	expect(sobj2.resolved.attributes).toMatchObject({
		positionX: 	0,
		positionY: 	0,
		scale: 		1
	})

	expect(sobj2.resolved.attributes).toBeTruthy()
	expect(sobj2.resolved.attributes.opacity).toBeFalsy()
})
test('logical objects, references', () => {

	let data = getTestData('basic')
		.concat(getTestData('logical1'))

	/*
	let tl = Resolver.getTimelineInWindow(data)
	console.log('tl.resolved',tl.resolved)
	expect(tl.resolved).toHaveLength( 3)
	expect(tl.unresolved).toHaveLength( 0)
	let logical0 = _.find(tl.resolved, {id: 'logical0'})
		expect(logical0).toBeTruthy() // TimelineObject

	let logical1 = _.find(tl.resolved, {id: 'logical1'})
		expect(logical1).toBeTruthy() // TimelineObject
	*/

	let state0 = Resolver.getState(clone(data), now)

	expect(state0.GLayers['1']).toBeTruthy() // TimelineResolvedObject
	expect(state0.GLayers['1'].id).toBe( 'obj0')

	expect(state0.GLayers['2']).toBeTruthy() // TimelineResolvedObject
	expect(state0.GLayers['2'].id).toBe( 'logical0')

	expect(state0.GLayers['3']).toBeTruthy() // TimelineResolvedObject
	expect(state0.GLayers['3'].id).toBe( 'logical1')

	expect(state0.GLayers['4']).toBeTruthy() // TimelineResolvedObject
	expect(state0.GLayers['4'].id).toBe( 'logical2')

	let state1 = Resolver.getState(clone(data), now + 1000)

	expect(state1.GLayers['2']).toBeTruthy() // TimelineResolvedObject
	expect(state1.GLayers['3']).toBeFalsy() // TimelineResolvedObject
	expect(state1.GLayers['4']).toBeTruthy() // TimelineResolvedObject
})
test('logical objects, references 2', () => {

	let data = getTestData('basic')
		.concat(getTestData('logical2'))

	// let tl = Resolver.getTimelineInWindow(data)

	let state0 = Resolver.getState(clone(data), now)

	expect(state0.GLayers['1']).toBeTruthy()
	expect(state0.GLayers['2']).toBeTruthy()
	expect(state0.GLayers['3']).toBeFalsy()

	let state1 = Resolver.getState(clone(data), now + 1000)

	expect(state1.GLayers['1']).toBeFalsy() // TimelineResolvedObject
	expect(state1.GLayers['2']).toBeFalsy() // TimelineResolvedObject
	expect(state1.GLayers['3']).toBeTruthy() // TimelineResolvedObject
})
test('logical objects, references 3', () => {

	let data = getTestData('basic')
		.concat(getTestData('logical3'))

	// let tl = Resolver.getTimelineInWindow(data)
	try {
		let state0 = Resolver.getState(clone(data), now)
		
		expect(state0.GLayers['1']).toBeTruthy()
		expect(state0.GLayers['2']).toBeTruthy()
		expect(state0.GLayers['3']).toBeFalsy()
		
		let state1 = Resolver.getState(clone(data), now + 1000)
		
		expect(state1.GLayers['1']).toBeFalsy() // TimelineResolvedObject
		expect(state1.GLayers['2']).toBeFalsy() // TimelineResolvedObject
		expect(state1.GLayers['3']).toBeTruthy() // TimelineResolvedObject
	} catch (e) {
		console.log(e, e.stack)
	}
})
test('setTraceLevel', () => {
	Resolver.setTraceLevel(TraceLevel.INFO)
	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

	Resolver.setTraceLevel(TraceLevel.ERRORS)
	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)

	Resolver.setTraceLevel('INFO')
	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

	Resolver.setTraceLevel('asdf')
	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)
})
test('getObjectsInWindow', () => {
	let data = clone(getTestData('basic'))

	let tld = Resolver.getObjectsInWindow (clone(data), now - 10, now + 10 )

	expect(tld.resolved).toHaveLength(1)
	expect(tld.unresolved).toHaveLength(0)
})
test('External functions', () => {
	let data = clone(getTestData('basic'))

	let state0 = Resolver.getState(data, now)

	expect(state0.LLayers['1']).toBeTruthy() // TimelineObject
	expect(state0.LLayers['1'].id).toBe( 'obj0')

	data[0].externalFunction = 'ext0'

	let externalFunctions0: ExternalFunctions = {
		'ext0': jest.fn((resolvedObj: TimelineResolvedObject, state: TimelineState, tld: DevelopedTimeline) => {
			// disable this object
			resolvedObj.resolved.disabled = true

			return true
		})
	}

	let state1 = Resolver.getState(data, now, externalFunctions0)

	expect(externalFunctions0.ext0).toHaveBeenCalledTimes(1)

	expect(state1.LLayers['1']).toBeFalsy() // TimelineObject
})
test('Expressions', () => {

	expect(Resolver.interpretExpression('1 + 2')).toMatchObject({
		l: '1',
		o: '+',
		r: '2'
	})

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('1 + 2')
	)).toEqual(3)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('4 * 5.5')
	)).toEqual(22)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('2 * (2 + 3) - 2 * 2')
	)).toEqual(6)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('2 * 2 + 3 - 2 * 2')
	)).toEqual(3)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('2 * 2 + 3 - 2 * 2')
	)).toEqual(3)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('5 + -3')
	)).toEqual(2)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('5 + - 3')
	)).toEqual(2)

	expect(Resolver.resolveExpression(
		Resolver.interpretExpression('')
	)).toEqual(NaN)

	expect(() => {
		Resolver.resolveLogicalExpression(
			Resolver.interpretExpression('5 + ) 2') // unbalanced paranthesis
		)
	}).toThrowError()
	expect(() => {
		Resolver.resolveLogicalExpression(
			Resolver.interpretExpression('5 ( + 2') // unbalanced paranthesis
	}).toThrowError()
	expect(() => {
		Resolver.resolveLogicalExpression(
			Resolver.interpretExpression('5 * ') // unbalanced expression
	}).toThrowError()

	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('1 | 0', true)
	)).toEqual(true)
	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('1 & 0', true)
	)).toEqual(false)

	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('1 | 0 & 0', true)
	)).toEqual(false)

	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('0 & 1 | 1', true)
	)).toEqual(false)
	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('(0 & 1) | 1', true)
	)).toEqual(true)

	expect(() => {
		Resolver.resolveLogicalExpression(
			Resolver.interpretExpression('(0 & 1) | 1 a', true) // strange operator
		)
	}).toThrowError()

	expect(Resolver.resolveLogicalExpression(
		Resolver.interpretExpression('(0 & 1) | a', true) // strange operand
	)).toEqual(false)
})
test('disabled objects on timeline', () => {

	let data = clone(getTestData('basic'))
	data[0].disabled = true

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength(2)
	expect(tl.unresolved).toHaveLength(0)

	let state0 = Resolver.getState(tl, now)

	expect(state0.LLayers['1']).toBeFalsy()
})
test('object with infinite duration', () => {

	let data = clone(getTestData('infiniteduration'))

	let tl = Resolver.getTimelineInWindow(data)

	expect(tl.resolved).toHaveLength(1)
	expect(tl.unresolved).toHaveLength(1) // because obj0 has infinite duration

	let state0 = Resolver.getState(tl, now)

	expect(state0.LLayers['1']).toBeTruthy()
	expect(state0.LLayers['1'].id).toBe( 'obj0')
})
test('bad objects on timeline', () => {

	expect(() => {
		let data = clone(getTestData('basic'))
		delete data[0].id
		Resolver.getState(clone(data), now)
	}).toThrowError()

	expect(() => {
		let data = clone(getTestData('basic'))
		delete data[0].trigger
		Resolver.getState(clone(data), now)
	}).toThrowError()
	expect(() => {
		let data = clone(getTestData('basic'))
		delete data[0].trigger.type
		Resolver.getState(clone(data), now)
	}).toThrowError()
	expect(() => {
		let data = clone(getTestData('basic'))
		delete data[0].LLayer
		Resolver.getState(clone(data), now)
	}).toThrowError()
	expect(() => {
		let data = clone(getTestData('basic'))
		data[0].id = 'asdf'
		data[1].id = 'asdf' // should be unique
		Resolver.getState(clone(data), now)
	}).toThrowError()

	expect(() => {
		let data = clone(getTestData('simplegroup'))
		delete data[0].content.objects
		Resolver.getState(clone(data), now)
	}).toThrowError()
})
test('simple group', () => {

	let data = clone(getTestData('simplegroup'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength(2)
	expect(tl.unresolved).toHaveLength(0)

	let tld = Resolver.developTimelineAroundTime(tl, now)
	expect(tld.resolved).toHaveLength(3)
	expect(tld.unresolved).toHaveLength(0)

	let events0 = Resolver.getNextEvents(tl, now)
	expect(events0).toHaveLength(5)
	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['2']).toBeTruthy()
	expect(state0.GLayers['2']).toBeTruthy()
	expect(state0.LLayers['2'].id).toBe( 'child0')

	let events1 = Resolver.getNextEvents(tl, now + 10)
	expect(events1).toHaveLength(3)
	let state1 = Resolver.getState(tl, now + 10)
	expect(state1.LLayers['2']).toBeTruthy()
	expect(state1.GLayers['2']).toBeTruthy()
	expect(state1.LLayers['2'].id).toBe( 'child1')

	let events2 = Resolver.getNextEvents(tl, now + 25)
	expect(events2).toHaveLength(2)
	let state2 = Resolver.getState(tl, now + 25)
	expect(state2.LLayers['2']).toBeFalsy()
	expect(state2.GLayers['2']).toBeFalsy()

	let state3 = Resolver.getState(tl, now + 60)
	expect(state3.LLayers['2']).toBeTruthy()
	expect(state3.GLayers['2']).toBeTruthy()
	expect(state3.LLayers['2'].id).toBe( 'obj1')
})
test('repeating group', () => {

	let data = clone(getTestData('repeatinggroup'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength(2)
	expect(tl.unresolved).toHaveLength(0)

	let tld0 = Resolver.developTimelineAroundTime(tl, now)

	expect(tld0.resolved).toHaveLength(3)
	expect(tld0.resolved[0].id).toBe('child0')
	expect(tld0.resolved[0].resolved.startTime).toBe(990)
	expect(tld0.resolved[1].id).toBe('child1')
	expect(tld0.resolved[1].resolved.startTime).toBe(1005)

	let events0 = Resolver.getNextEvents(tl, now)
	expect(events0).toHaveLength(5)
	expect(events0[0]).toMatchObject({
		type: EventType.END, time: 1005, obj: {id: 'child0'}})
	expect(events0[1]).toMatchObject({
		type: EventType.START, time: 1005, obj: {id: 'child1'}})
	expect(events0[2]).toMatchObject({
		type: EventType.END, time: 1015, obj: {id: 'child1'}})

	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['1']).toBeTruthy()
	expect(state0.LLayers['1'].id).toBe( 'child0')

	let tld1 = Resolver.developTimelineAroundTime(tl, now + 10)
	expect(tld1.resolved).toHaveLength(3)
	expect(tld1.resolved[0].id).toBe('child1')
	expect(tld1.resolved[0].resolved.startTime).toBe(1005)
	expect(tld1.resolved[1].id).toBe('child0')
	expect(tld1.resolved[1].resolved.startTime).toBe(1015)
	let events1 = Resolver.getNextEvents(tl, now + 10)
	expect(events1).toHaveLength(5)
	expect(events1[0]).toMatchObject({
		type: EventType.END, time: 1015, obj: {id: 'child1'}})
	expect(events1[1]).toMatchObject({
		type: EventType.START, time: 1015, obj: {id: 'child0'}})
	expect(events1[2]).toMatchObject({
		type: EventType.END, time: 1030, obj: {id: 'child0'}})

	let state1 = Resolver.getState(tl, now + 10)
	expect(state1.LLayers['1']).toBeTruthy()
	expect(state1.LLayers['1'].id).toBe( 'child1')

	// Next loop:
	let tld2 = Resolver.developTimelineAroundTime(tl, now + 25)
	expect(tld2.resolved).toHaveLength(3)
	expect(tld2.resolved[0].id).toBe('child0')
	expect(tld2.resolved[0].resolved.startTime).toBe(1015)
	expect(tld2.resolved[1].id).toBe('child1')
	expect(tld2.resolved[1].resolved.startTime).toBe(1030)
	let events2 = Resolver.getNextEvents(tl, now + 25)
	expect(events2).toHaveLength(5)
	expect(events2[0]).toMatchObject({
		type: EventType.END, time: 1030, obj: {id: 'child0'}})
	expect(events2[1]).toMatchObject({
		type: EventType.START, time: 1030, obj: {id: 'child1'}})
	expect(events2[2]).toMatchObject({
		type: EventType.END, time: 1040, obj: {id: 'child1'}})

	let state2 = Resolver.getState(tl, now + 25)
	expect(state2.LLayers['1']).toBeTruthy()
	expect(state2.LLayers['1'].id).toBe( 'child0')

	let state3 = Resolver.getState(tl, now + 35)
	expect(state3.LLayers['1']).toBeTruthy()
	expect(state3.LLayers['1'].id).toBe( 'child1')
	let events3 = Resolver.getNextEvents(tl, now + 35)
	expect(events3).toHaveLength(5)

	// just before group0 is done:
	// let tld4 = Resolver.developTimelineAroundTime(tl, now + 50)
	let events4 = Resolver.getNextEvents(tl, now + 50)
	expect(events4[0]).toMatchObject({
		type: EventType.END, time: 1053, obj: {id: 'child0'}})
	expect(events4[1]).toMatchObject({
		type: EventType.START, time: 1053, obj: {id: 'obj1'}})
	expect(events4[2]).toMatchObject({
		type: EventType.END, time: 1070, obj: {id: 'obj1'}})

})
test('repeating group in repeating group', () => {

	let data = clone(getTestData('repeatinggroupinrepeatinggroup'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength(2)
	expect(tl.unresolved).toHaveLength(0)

	let tld0 = Resolver.developTimelineAroundTime(tl, now)

	expect(tld0.resolved).toHaveLength(4)
	expect(tld0.groups).toHaveLength(2)
	expect(tld0.unresolved).toHaveLength(0)

	expect(tld0.resolved[0]).toMatchObject({
		id: 'child0', resolved: {startTime: 1000}})
	expect(tld0.resolved[1]).toMatchObject({
		id: 'child1', resolved: {startTime: 1030}})
	expect(tld0.resolved[2]).toMatchObject({
		id: 'child2', resolved: {startTime: 1040}})
	expect(tld0.resolved[3]).toMatchObject({
		id: 'obj1', resolved: {startTime: 1300}})

	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['1']).toBeTruthy()
	expect(state0.LLayers['1'].id).toBe( 'child0')

	let events0 = Resolver.getNextEvents(tl, now)
	expect(events0).toHaveLength(8)
	expect(events0[0]).toMatchObject({
		type: EventType.START, time: 1000, obj: {id: 'child0'}})
	expect(events0[1]).toMatchObject({
		type: EventType.END, time: 1030, obj: {id: 'child0'}})
	expect(events0[2]).toMatchObject({
		type: EventType.START, time: 1030, obj: {id: 'child1'}})
	expect(events0[3]).toMatchObject({
		type: EventType.END, time: 1040, obj: {id: 'child1'}})
	expect(events0[4]).toMatchObject({
		type: EventType.START, time: 1040, obj: {id: 'child2'}})
	expect(events0[5]).toMatchObject({
		type: EventType.END, time: 1055, obj: {id: 'child2'}})
	expect(events0[6]).toMatchObject({
		type: EventType.START, time: 1300, obj: {id: 'obj1'}})
	expect(events0[7]).toMatchObject({
		type: EventType.END, time: 1360, obj: {id: 'obj1'}})

	// a bit in:
	let state1 = Resolver.getState(tl, now + 50)
	expect(state1.LLayers['1']).toBeTruthy()
	expect(state1.LLayers['1'].id).toBe( 'child2')

	let events1 = Resolver.getNextEvents(tl, now + 50)
	expect(events1).toHaveLength(7)
	expect(events1[0]).toMatchObject({
		type: EventType.END, time: 1055, obj: {id: 'child2'}})
	expect(events1[1]).toMatchObject({
		type: EventType.START, time: 1055, obj: {id: 'child1'}})
	expect(events1[2]).toMatchObject({
		type: EventType.END, time: 1065, obj: {id: 'child1'}})

	// just before group1 is done playing:
	let state2 = Resolver.getState(tl, now + 91)
	expect(state2.LLayers['1']).toBeTruthy()
	expect(state2.LLayers['1'].id).toBe( 'child2')

	let events2 = Resolver.getNextEvents(tl, now + 91)

	expect(events2[0]).toMatchObject({
		type: EventType.END, time: 1092, obj: {id: 'child2'}})
	expect(events2[1]).toMatchObject({
		type: EventType.START, time: 1092, obj: {id: 'child0'}})
	expect(events2[2]).toMatchObject({
		type: EventType.END, time: 1122, obj: {id: 'child0'}})
})
test('infinite group', () => {
	let data = clone(getTestData('infinitegroup'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength(1)
	expect(tl.unresolved).toHaveLength(0)

	let tld = Resolver.developTimelineAroundTime(tl, now)
	expect(tld.resolved).toHaveLength(2)
	expect(tld.unresolved).toHaveLength(0)

	let events0 = Resolver.getNextEvents(tl, now)
	expect(events0).toHaveLength(3)
	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['1']).toBeTruthy()
	expect(state0.LLayers['1'].id).toBe( 'child0')
})
test('logical objects in group', () => {
	let data = clone(getTestData('logicalInGroup'))

	let tl = Resolver.getTimelineInWindow(data)
	expect(tl.resolved).toHaveLength(1)
	expect(tl.unresolved).toHaveLength(1)

	let tld = Resolver.developTimelineAroundTime(tl, now)
	expect(tld.resolved).toHaveLength(1)
	expect(tld.unresolved).toHaveLength(1)

	let events0 = Resolver.getNextEvents(tl, now)
	expect(events0).toHaveLength(0)
	// Resolver.setTraceLevel(TraceLevel.TRACE)
	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['2']).toBeTruthy()
	expect(state0.GLayers['2']).toBeTruthy()
	expect(state0.LLayers['2'].id).toBe( 'child0')

	expect(state0.LLayers['3']).toBeTruthy()
	expect(state0.GLayers['3']).toBeTruthy()
	expect(state0.LLayers['3'].id).toBe( 'outside0')
})
test('logical objects in group with logical expr', () => {
	let data = clone(getTestData('logicalInGroupLogical'))

	let tl = Resolver.getTimelineInWindow(data)
	// expect(tl.resolved).toHaveLength(1)
	// expect(tl.unresolved).toHaveLength(1)

	// let tld = Resolver.developTimelineAroundTime(tl, now)
	// expect(tld.resolved).toHaveLength(2)
	// expect(tld.unresolved).toHaveLength(1)

	// let events0 = Resolver.getNextEvents(tl, now)
	// expect(events0).toHaveLength(0)
	// Resolver.setTraceLevel(TraceLevel.TRACE)
	let state0 = Resolver.getState(tl, now)
	expect(state0.LLayers['2']).toBeTruthy()
	expect(state0.GLayers['2']).toBeTruthy()
	expect(state0.LLayers['2'].id).toBe( 'child0')

	expect(state0.LLayers['4']).toBeFalsy()
	expect(state0.GLayers['4']).toBeFalsy()
})
// TOOD: test group

// TODO: test looping group

// TODO: test .useExternalFunctions
