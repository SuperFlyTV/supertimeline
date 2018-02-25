import * as _ from 'underscore';
var clone = require('fast-clone');


import {currentTime} from '../lib/lib'
import {TriggerType, TraceLevel, EventType} from '../enums/enums'
import {Resolver, TimelineObject} from '../resolver/resolver'
//var assert = require('assert');

var now = currentTime();


var testData = {
	'basic': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: now - 10 // 10 seconds ago
			},
			duration: 60, // 1 minute long
			LLayer: 1
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
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
	],
	'basic3': [
		{
			id: 'obj1',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 960,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{
			id: 'obj2',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 11, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 11, // Logical layer

			classes: ['main'], // used by logical expressions
		}
	],
	'override': [
		{
			id: 'obj3',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 960,
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'], // used by logical expressions
		},
		{ // This should be overridden by 'obj3'
			id: 'obj4',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 970,
			},

			LLayer: 10, // Logical layer
			
			classes: ['main'], // used by logical expressions
		}
	],
	'override2': [{
		id: 'obj5',

		content: {
			media: 'AMB',
			GLayer: 10, // Graphical layer
		},
		trigger: {
			type: TriggerType.TIME_ABSOLUTE, 
			value: 970,
		},

		LLayer: 10, // Logical layer
		priority: 1,
		classes: ['main'], // used by logical expressions
	}],
	'override3': [
		{
			id: 'obj6',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 980,
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'], // used by logical expressions
		}
	],
	'relative1': [
		{

			id: 'obj0', // Unique id

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj1', // Unique id

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj0.end + 5 - 1',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj2', // Unique id

			
			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj0 + (9 * 2)',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj3', // Unique id

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj2.start - 10',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj4', // Unique id

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj3.end + #obj2.duration',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj5', // Unique id

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '(#obj4.start + #obj4.end)/ 2',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'badObj0',

			
			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#badReference + (9 * 2)',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
	],
	'relative2': [
		{

			id: 'obj0', // Unique id

			
			//duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{ // will be unresolved, due to referenced object doesn't have any endTime

			id: 'obj1',

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj0.end + 5',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{ 

			id: 'obj2',

			
			duration: 50, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj0.start + 15',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
	],
	'keyframes1': [
		{

			id: 'obj0', // Unique id

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
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
								brightness: 0.1,
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
								opacity: 0.2,
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
					},
				],

			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj0.start + 15',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
		{

			id: 'obj3', // Unique id

			
			duration: 10, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: TriggerType.TIME_RELATIVE, 
				value: '#obj2.start + 20',
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		},
	],
	'abskeyframe': [
		{

			id: 'obj0',
			duration: 50,
			trigger: {
				type: TriggerType.TIME_ABSOLUTE, 
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
							type: TriggerType.TIME_ABSOLUTE,
							value: 5 // Abslute time means "relative to parent start time" for a keyframe
						},
						content: {
							attributes: {
								scale: 0.5,
								opacity: 0.5
							}
						}
					},
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
				value: '1',
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
				value: '#obj0 & #logical0',
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
				value: '#obj0 | #logical0',
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
				value: '$L1', // LLayer 1
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
				value: '!$L1', // LLayer 1
			},
			LLayer: 3,
			content: {
			}
		}
	],
};
var getTestData = (dataset:string) => {
	return clone(testData[dataset]);
}

test('Basic timeline', () => {

	
	var data = getTestData('basic');

	

	var tl = Resolver.getTimelineInWindow(data);

	expect(tl.resolved).toHaveLength(2);
	expect(tl.unresolved).toHaveLength(0);

	
	var nextEvents = Resolver.getNextEvents(data, now - 100);

	expect(nextEvents).toHaveLength( 4);
	expect(nextEvents[0].type).toBe( EventType.START);
	//expect(nextEvents[0].time).toBe( 950);
	expect(nextEvents[1].type).toBe( EventType.END);
	//expect(nextEvents[1].time).toBe( 1050);

	var state = Resolver.getState(data, now);
	
	expect(state.GLayers['1']).toBeTruthy() // TimelineObject;
	expect(state.time).toBe( now);
	expect(state.GLayers['1'].id).toBe( 'obj0');
	expect(state.LLayers['1'].id).toBe( 'obj0');

	var state2 = Resolver.getState(tl, now);

	expect(state2.GLayers['1'].id).toBe( 'obj0');
});
test('Basic timeline 2', () => {

	var data = getTestData('basic2');

	var tl = Resolver.getTimelineInWindow(data);
	expect(tl.resolved).toHaveLength( 1);
	expect(tl.unresolved).toHaveLength( 0);

	
	var nextEvents = Resolver.getNextEvents(data, 900);
	expect(nextEvents).toHaveLength( 2);
	expect(nextEvents[0].type).toBe( EventType.START);
	expect(nextEvents[0].time).toBe( 950);
	expect(nextEvents[1].type).toBe( EventType.END);
	expect(nextEvents[1].time).toBe( 1050);

	var state = Resolver.getState(data, 1000);
	
	expect(state.time).toBe( 1000);
	expect(state.GLayers['10'].id).toBe( 'obj0');
	expect(state.LLayers['10'].id).toBe( 'obj0');

	var state2 = Resolver.getState(tl, 1000);

	expect(state2.GLayers['10'].id).toBe( 'obj0');
})
test('Basic timeline 3', () => {


	var data = getTestData('basic2')
		.concat(getTestData('basic3'))

	
	
	var tl = Resolver.getTimelineInWindow(data);
	expect(tl.resolved).toHaveLength( 3);
	expect(tl.unresolved).toHaveLength( 0);

	var nextEvents = Resolver.getNextEvents(tl, 1000, 1); // limit
	expect(nextEvents).toHaveLength( 1); // see that the limit is working
	expect(nextEvents[0].type).toBe( EventType.END);
	expect(nextEvents[0].time).toBe( 1050);




	var state = Resolver.getState(tl, 1000);
	expect(state.LLayers['10'].id).toBe( 'obj1');
	expect(state.LLayers['11'].id).toBe( 'obj2');
});
test('Timeline, override object', () => {

	var data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))

	var state = Resolver.getState(data, 1000);
	expect(state.LLayers['10'].id).toBe( 'obj3');
})
test('Timeline, override object 2', () => {

	var data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))
		.concat(getTestData('override2'))

	var state = Resolver.getState(data, 1000);
	expect(state.LLayers['10'].id).toBe( 'obj5');
	
	var stateInFuture = Resolver.getState(data, 10000);
	expect(stateInFuture.LLayers['10'].id).toBe( 'obj5');
})
test('Timeline, override object 2', () => {

	var data = getTestData('basic2')
		.concat(getTestData('basic3'))
		.concat(getTestData('override'))
		.concat(getTestData('override2'))
		.concat(getTestData('override3'))
	

	var state = Resolver.getState(data, 1000);
	expect(state.LLayers['10'].id).toBe( 'obj6');
	
	var stateInFuture = Resolver.getState(data, 10000);
	expect(stateInFuture.LLayers['10'].id).toBe( 'obj5');
})
test('Timeline, relative timing', () => {

	var data = getTestData('relative1');
		

	var tl = Resolver.getTimelineInWindow(data);
		
	
		expect(tl.resolved).toHaveLength( 6);
		expect(tl.unresolved).toHaveLength( 1);

		var obj1 = _.find(tl.resolved, {id: 'obj1'});
		expect(obj1).toBeTruthy() // TimelineObject;;
		expect(obj1.resolved.startTime).toBe( 1054);
		expect(obj1.resolved.endTime).toBe( 1064);
		
		var obj2 = _.find(tl.resolved, {id: 'obj2'});
		expect(obj2).toBeTruthy() // TimelineObject;;
		expect(obj2.resolved.startTime).toBe( 1068);
		expect(obj2.resolved.endTime).toBe( 1118);

		var obj3 = _.find(tl.resolved, {id: 'obj3'});
		expect(obj3).toBeTruthy() // TimelineObject;;
		expect(obj3.resolved.startTime).toBe( 1058);
		expect(obj3.resolved.endTime).toBe( 1068);

		var obj4 = _.find(tl.resolved, {id: 'obj4'});
		expect(obj4).toBeTruthy() // TimelineObject;;
		expect(obj4.resolved.startTime).toBe( 1118);
		expect(obj4.resolved.endTime).toBe( 1128);

		var obj5 = _.find(tl.resolved, {id: 'obj5'});
		expect(obj5).toBeTruthy() // TimelineObject;;
		expect(obj5.resolved.startTime).toBe( 1123);
		expect(obj5.resolved.endTime).toBe( 1133);

	var state0 = Resolver.getState(data, 1067);

		expect(state0.GLayers['10'].id).toBe( 'obj3');

	var state1 = Resolver.getState(data, 1068);
		
		expect(state1.GLayers['10'].id).toBe( 'obj2');


	var nextEvents = Resolver.getNextEvents(tl, 900);

		expect(nextEvents).toHaveLength( 10);

		expect(nextEvents[0].type).toBe( EventType.START);
		expect(nextEvents[0].time).toBe( 950);

		expect(nextEvents[1].type).toBe( EventType.END);
		expect(nextEvents[1].time).toBe( 1050);

		expect(nextEvents[2].type).toBe( EventType.START);
		expect(nextEvents[2].time).toBe( 1054);

		expect(nextEvents[3].type).toBe( EventType.START);
		expect(nextEvents[3].time).toBe( 1058);

		expect(nextEvents[4].type).toBe( EventType.END);
		expect(nextEvents[4].time).toBe( 1064);

		expect(nextEvents[5].type).toBe( EventType.END);
		expect(nextEvents[5].time).toBe( 1068);

		expect(nextEvents[8].type).toBe( EventType.START);
		expect(nextEvents[8].obj.id).toBe( 'obj4');
		expect(nextEvents[8].time).toBe( 1118);
})
test('Timeline, relative timing 2', () => {

	var data = getTestData('relative2');

	var tl = Resolver.getTimelineInWindow(data);
		
		expect(tl.resolved).toHaveLength( 2);
		expect(tl.unresolved).toHaveLength( 1);
		
		var obj2 = _.find(tl.resolved, {id: 'obj2'});
			expect(obj2).toBeTruthy() // TimelineObject;;
			expect(obj2.resolved.startTime).toBe( 965);
			expect(obj2.resolved.endTime).toBe( 1015);


	var state0 = Resolver.getState(data, 1000);
		
		expect(state0.GLayers['10'].id).toBe( 'obj2');
	
	var state1 = Resolver.getState(data, 2000);

		expect(state1.GLayers['10'].id).toBe( 'obj0');	
})
test('Timeline, relative timing and keyframes', () => {

	var data = getTestData('keyframes1');

	var tl = Resolver.getTimelineInWindow(data);
	
		expect(tl.resolved).toHaveLength( 3);
		expect(tl.unresolved).toHaveLength( 0);
		
		var obj2 = _.find(tl.resolved, {id: 'obj2'});


			expect(obj2).toBeTruthy() // TimelineObject;;
			expect(obj2.resolved.startTime).toBe( 965);
			expect(obj2.resolved.endTime).toBe( 1015);

		var obj3 = _.find(tl.resolved, {id: 'obj3'});

			
			expect(obj3).toBeTruthy() // TimelineObject;;
			expect(obj3.resolved.startTime).toBe( 985);
	
	var nextEvents0 = Resolver.getNextEvents(data, 100);
		expect(nextEvents0).toHaveLength( 10);
	var nextEvents1 = Resolver.getNextEvents(data, 2000);
		expect(nextEvents1).toHaveLength( 0);


	var state0 = Resolver.getState(data, 966);
			

		var sobj2 = state0.GLayers['10'];
		
		expect(sobj2.id).toBe( 'obj2');
		expect(sobj2.resolved.mixer.opacity).toBe( 0.1);
		expect(sobj2.resolved.mixer.brightness).toBe( 0.1);
		expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy();
		

	var state1 = Resolver.getState(data, 967);

		sobj2 = state1.GLayers['10'];

		expect(sobj2.resolved.mixer.opacity).toBe( 0.2);
		expect(sobj2.resolved.mixer.brightness).toBe( 0.1);
		expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy();

	var state2 = Resolver.getState(data, 984);

		sobj2 = state2.GLayers['10'];
		
		
		expect(sobj2.resolved.mixer.opacity).toBe( 0.3);
		expect(sobj2.resolved.mixer.myCustomAttribute).toBe( 1);
})
test('Timeline, absolute keyframe', () => {

	var data = getTestData('abskeyframe');

	var tl = Resolver.getTimelineInWindow(data);
	
		expect(tl.resolved).toHaveLength( 1);
		expect(tl.unresolved).toHaveLength( 0);
		
		var obj0 = _.find(tl.resolved, {id: 'obj0'});


			expect(obj0).toBeTruthy() // TimelineObject;
			expect(obj0.resolved.startTime).toBe( 1000);
			expect(obj0.resolved.endTime).toBe( 1050);

	var state0 = Resolver.getState(clone(data), 1000);

		var sobj0 = state0.GLayers['1'];

		expect(sobj0).toBeTruthy() // TimelineResolvedObject;
		expect(sobj0.id).toBe( 'obj0');
		expect(sobj0.resolved).toBeTruthy() // TimelineResolvedObject;;
		expect(sobj0.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		});
		expect(sobj0.resolved.attributes.opacity).toBeFalsy();

	var state1 = Resolver.getState(clone(data), 1005);

		var sobj1 = state1.GLayers['1'];
		expect(sobj1).toBeTruthy() // TimelineResolvedObject;;
		expect(sobj1.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		0.5,
			opacity: 	0.5
		});

	var state2 = Resolver.getState(clone(data), 1010);

		var sobj2 = state2.GLayers['1'];
		expect(sobj2).toBeTruthy() // TimelineResolvedObject;;
		expect(sobj2.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		});
		
		expect(sobj2.resolved.attributes).toBeTruthy();
		expect(sobj2.resolved.attributes.opacity).toBeFalsy();
})
test('logical objects, references', () => {

	var data = getTestData('basic')
		.concat(getTestData('logical1'))

	var tl = Resolver.getTimelineInWindow(data);
		/*
		console.log('tl.resolved',tl.resolved);
		expect(tl.resolved).toHaveLength( 3);
		expect(tl.unresolved).toHaveLength( 0);
		var logical0 = _.find(tl.resolved, {id: 'logical0'});
			expect(logical0).toBeTruthy() // TimelineObject;

		var logical1 = _.find(tl.resolved, {id: 'logical1'});
			expect(logical1).toBeTruthy() // TimelineObject;
		*/

	var state0 = Resolver.getState(clone(data), now);

		expect(state0.GLayers['1']).toBeTruthy() // TimelineResolvedObject;
		expect(state0.GLayers['1'].id).toBe( 'obj0');

		expect(state0.GLayers['2']).toBeTruthy() // TimelineResolvedObject;
		expect(state0.GLayers['2'].id).toBe( 'logical0');

		expect(state0.GLayers['3']).toBeTruthy() // TimelineResolvedObject;
		expect(state0.GLayers['3'].id).toBe( 'logical1');

		expect(state0.GLayers['4']).toBeTruthy() // TimelineResolvedObject;
		expect(state0.GLayers['4'].id).toBe( 'logical2');


	var state1 = Resolver.getState(clone(data), now+1000);

		expect(state1.GLayers['2']).toBeTruthy() // TimelineResolvedObject;;
		expect(state1.GLayers['3']).toBeFalsy() // TimelineResolvedObject;;
		expect(state1.GLayers['4']).toBeTruthy() // TimelineResolvedObject;;
})
test('logical objects, references 2', () => {

	var data = getTestData('basic')
		.concat(getTestData('logical2'))

	var tl = Resolver.getTimelineInWindow(data);

	var state0 = Resolver.getState(clone(data), now);

		expect(state0.GLayers['1']).toBeTruthy();
		expect(state0.GLayers['2']).toBeTruthy();
		expect(state0.GLayers['3']).toBeFalsy();
		


	var state1 = Resolver.getState(clone(data), now+1000);


		expect(state1.GLayers['1']).toBeFalsy() // TimelineResolvedObject;;
		expect(state1.GLayers['2']).toBeFalsy() // TimelineResolvedObject;;
		expect(state1.GLayers['3']).toBeTruthy() // TimelineResolvedObject;;
		
		
})


// TOOD: test group

// TODO: test looping group

// TODO: test .useExternalFunctions
