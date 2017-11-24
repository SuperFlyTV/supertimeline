var SuperTimeline = require('./index.js');
var _ = require('underscore');
var clone = require('fast-clone');
var assert = require('assert');

var tests = [
	function () {
		// Most basic test

		var now = Date.now()/1000;
		var data = [
			{
				id: 'obj0', // the id must be unique

				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
					value: now - 10 // 10 seconds ago
				},
				duration: 60, // 1 minute long
				LLayer: 1
			},
			{
				id: 'obj1', // the id must be unique

				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
					value: '#obj0.end'
				},
				duration: 60, // 1 minute long
				LLayer: 1
			},
		];

		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
		assert.equal(tl.resolved.length, 2);
		assert.equal(tl.unresolved.length, 0);

		
		var nextEvents = SuperTimeline.resolver.getNextEvents(data, now - 100);
		assert.equal(nextEvents.length, 4);
		assert.equal(nextEvents[0].type, SuperTimeline.enums.TimelineEventType.START);
		//assert.equal(nextEvents[0].time, 950);
		assert.equal(nextEvents[1].type, SuperTimeline.enums.TimelineEventType.END);
		//assert.equal(nextEvents[1].time, 1050);

		var state = SuperTimeline.resolver.getState(data, now);
		
		assert(state.GLayers['1']);
		assert.equal(state.time, now);
		assert.equal(state.GLayers['1'].id, 'obj0');
		assert.equal(state.LLayers['1'].id, 'obj0');

		var state2 = SuperTimeline.resolver.getState(tl, now);

		assert.equal(state2.GLayers['1'].id, 'obj0');

		return data;
	},

	function () {

		var data = [
			{

				id: 'obj0', // Unique id

				duration: 100, // in seconds

				content: {
					media: 'AMB',
					GLayer: 10, // Graphical layer
				},
				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
					value: 950,
				},

				LLayer: 10, // Logical layer

				classes: ['main'], // used by logical expressions
			},
		];

		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
		assert.equal(tl.resolved.length, 1);
		assert.equal(tl.unresolved.length, 0);

		
		var nextEvents = SuperTimeline.resolver.getNextEvents(data, 900);
		assert.equal(nextEvents.length, 2);
		assert.equal(nextEvents[0].type, SuperTimeline.enums.TimelineEventType.START);
		assert.equal(nextEvents[0].time, 950);
		assert.equal(nextEvents[1].type, SuperTimeline.enums.TimelineEventType.END);
		assert.equal(nextEvents[1].time, 1050);

		var state = SuperTimeline.resolver.getState(data, 1000);
		
		assert.equal(state.time, 1000);
		assert.equal(state.GLayers['10'].id, 'obj0');
		assert.equal(state.LLayers['10'].id, 'obj0');

		var state2 = SuperTimeline.resolver.getState(tl, 1000);

		assert.equal(state2.GLayers['10'].id, 'obj0');

		return data;
	},
	function (data) {

		data.push({
			id: 'obj1',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 960,
			},

			LLayer: 10, // Logical layer

			classes: ['main'], // used by logical expressions
		});

		data.push({
			id: 'obj2',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 11, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 950,
			},

			LLayer: 11, // Logical layer

			classes: ['main'], // used by logical expressions
		});
		
		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
		assert.equal(tl.resolved.length, 3);
		assert.equal(tl.unresolved.length, 0);

		var nextEvents = SuperTimeline.resolver.getNextEvents(tl, 1000, 1); // limit
		assert.equal(nextEvents.length, 1); // see that the limit is working
		assert.equal(nextEvents[0].type, SuperTimeline.enums.TimelineEventType.END);
		assert.equal(nextEvents[0].time, 1050);




		var state = SuperTimeline.resolver.getState(tl, 1000);
		assert.equal(state.LLayers['10'].id, 'obj1');
		assert.equal(state.LLayers['11'].id, 'obj2');



		
		

		return data;
	},
	function (data) {

		data.push({
			id: 'obj3',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 960,
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'], // used by logical expressions
		});

		data.push({ // This should be overridden by 'obj3'
			id: 'obj4',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 970,
			},

			LLayer: 10, // Logical layer
			
			classes: ['main'], // used by logical expressions
		});

		
		var state = SuperTimeline.resolver.getState(data, 1000);
		assert.equal(state.LLayers['10'].id, 'obj3');
		return data;
	},
	function (data) {

		data.push({
			id: 'obj5',

			

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 970,
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'], // used by logical expressions
		});

		
		var state = SuperTimeline.resolver.getState(data, 1000);
		assert.equal(state.LLayers['10'].id, 'obj5');
		
		var stateInFuture = SuperTimeline.resolver.getState(data, 10000);
		assert.equal(stateInFuture.LLayers['10'].id, 'obj5');

		return data;
	},
	function (data) {

		data.push({
			id: 'obj6',

			
			duration: 100, // in seconds

			content: {
				media: 'AMB',
				GLayer: 10, // Graphical layer
			},
			trigger: {
				type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
				value: 980,
			},

			LLayer: 10, // Logical layer
			priority: 1,
			classes: ['main'], // used by logical expressions
		});
		

		var state = SuperTimeline.resolver.getState(data, 1000);
		assert.equal(state.LLayers['10'].id, 'obj6');
		
		var stateInFuture = SuperTimeline.resolver.getState(data, 10000);
		assert.equal(stateInFuture.LLayers['10'].id, 'obj5');


		

		return data;
	},
	// test relative timing:
	function () {

		var data = [
			{

				id: 'obj0', // Unique id

				
				duration: 100, // in seconds

				content: {
					media: 'AMB',
					GLayer: 10, // Graphical layer
				},
				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
					value: '#badReference + (9 * 2)',
				},

				LLayer: 10, // Logical layer

				classes: ['main'], // used by logical expressions
			},

		];

		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
			
		
			assert.equal(tl.resolved.length, 6);
			assert.equal(tl.unresolved.length, 1);

			var obj1 = _.find(tl.resolved, {id: 'obj1'});
			assert(obj1);
			assert.equal(obj1.resolved.startTime, 1054);
			assert.equal(obj1.resolved.endTime, 1064);
			
			var obj2 = _.find(tl.resolved, {id: 'obj2'});
			assert(obj2);
			assert.equal(obj2.resolved.startTime, 1068);
			assert.equal(obj2.resolved.endTime, 1118);

			var obj3 = _.find(tl.resolved, {id: 'obj3'});
			assert(obj3);
			assert.equal(obj3.resolved.startTime, 1058);
			assert.equal(obj3.resolved.endTime, 1068);

			var obj4 = _.find(tl.resolved, {id: 'obj4'});
			assert(obj4);
			assert.equal(obj4.resolved.startTime, 1118);
			assert.equal(obj4.resolved.endTime, 1128);

			var obj5 = _.find(tl.resolved, {id: 'obj5'});
			assert(obj5);
			assert.equal(obj5.resolved.startTime, 1123);
			assert.equal(obj5.resolved.endTime, 1133);

		var state0 = SuperTimeline.resolver.getState(data, 1067);

			assert.equal(state0.GLayers['10'].id, 'obj3');

		var state1 = SuperTimeline.resolver.getState(data, 1068);
			
			assert.equal(state1.GLayers['10'].id, 'obj2');


		var nextEvents = SuperTimeline.resolver.getNextEvents(tl, 900);

			assert.equal(nextEvents.length, 10);

			assert.equal(nextEvents[0].type, SuperTimeline.enums.TimelineEventType.START);
			assert.equal(nextEvents[0].time, 950);

			assert.equal(nextEvents[1].type, SuperTimeline.enums.TimelineEventType.END);
			assert.equal(nextEvents[1].time, 1050);

			assert.equal(nextEvents[2].type, SuperTimeline.enums.TimelineEventType.START);
			assert.equal(nextEvents[2].time, 1054);

			assert.equal(nextEvents[3].type, SuperTimeline.enums.TimelineEventType.START);
			assert.equal(nextEvents[3].time, 1058);

			assert.equal(nextEvents[4].type, SuperTimeline.enums.TimelineEventType.END);
			assert.equal(nextEvents[4].time, 1064);

			assert.equal(nextEvents[5].type, SuperTimeline.enums.TimelineEventType.END);
			assert.equal(nextEvents[5].time, 1068);
 
			assert.equal(nextEvents[8].type, SuperTimeline.enums.TimelineEventType.START);
			assert.equal(nextEvents[8].obj.id, 'obj4');
			assert.equal(nextEvents[8].time, 1118);


		return data;
	},

	function () {

		var data = [
			{

				id: 'obj0', // Unique id

				
				//duration: 100, // in seconds

				content: {
					media: 'AMB',
					GLayer: 10, // Graphical layer
				},
				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
					value: '#obj0.start + 15',
				},

				LLayer: 10, // Logical layer

				classes: ['main'], // used by logical expressions
			},

		];

		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
			
		
			assert.equal(tl.resolved.length, 2);
			assert.equal(tl.unresolved.length, 1);
			
			var obj2 = _.find(tl.resolved, {id: 'obj2'});
				assert(obj2);
				assert.equal(obj2.resolved.startTime, 965);
				assert.equal(obj2.resolved.endTime, 1015);


		var state0 = SuperTimeline.resolver.getState(data, 1000);
			
			assert.equal(state0.GLayers['10'].id, 'obj2');
		
		var state1 = SuperTimeline.resolver.getState(data, 2000);

			assert.equal(state1.GLayers['10'].id, 'obj0');

		return data;
	},

	// test keyframes:
	function () {

		var data = [
			{

				id: 'obj0', // Unique id

				
				duration: 100, // in seconds

				content: {
					media: 'AMB',
					GLayer: 10, // Graphical layer
				},
				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
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
								type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
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
								type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
								type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
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
					type: SuperTimeline.enums.TriggerType.TIME_RELATIVE, 
					value: '#obj2.start + 20',
				},

				LLayer: 10, // Logical layer

				classes: ['main'], // used by logical expressions
			},
		];

		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
		
			assert.equal(tl.resolved.length, 3);
			assert.equal(tl.unresolved.length, 0);
			
			var obj2 = _.find(tl.resolved, {id: 'obj2'});


				assert(obj2);
				assert.equal(obj2.resolved.startTime, 965);
				assert.equal(obj2.resolved.endTime, 1015);

			var obj3 = _.find(tl.resolved, {id: 'obj3'});

				
				assert(obj3);
				assert.equal(obj3.resolved.startTime, 985);


		var state0 = SuperTimeline.resolver.getState(data, 966);
				

			var sobj2 = state0.GLayers['10'];
			
			assert.equal(sobj2.id, 'obj2');
			assert.equal(sobj2.resolved.mixer.opacity, 0.1);
			assert.equal(sobj2.resolved.mixer.brightness, 0.1);
			assert(!sobj2.resolved.mixer.myCustomAttribute);
			

		var state1 = SuperTimeline.resolver.getState(data, 967);

			sobj2 = state1.GLayers['10'];

			assert.equal(sobj2.resolved.mixer.opacity, 0.2);
			assert.equal(sobj2.resolved.mixer.brightness, 0.1);
			assert(!sobj2.resolved.mixer.myCustomAttribute);

		var state2 = SuperTimeline.resolver.getState(data, 984);

			sobj2 = state2.GLayers['10'];
			
			
			assert.equal(sobj2.resolved.mixer.opacity, 0.3);
			assert.equal(sobj2.resolved.mixer.myCustomAttribute, 1);

		return data;
	},
	function () {

		var data = [
			
			{

				id: 'obj0',
				duration: 50,
				trigger: {
					type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE, 
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
								type: SuperTimeline.enums.TriggerType.TIME_ABSOLUTE,
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
		];
		var tl = SuperTimeline.resolver.getTimelineInWindow(data);
		
			assert.equal(tl.resolved.length, 1);
			assert.equal(tl.unresolved.length, 0);
			
			var obj0 = _.find(tl.resolved, {id: 'obj0'});


				assert(obj0);
				assert.equal(obj0.resolved.startTime, 1000);
				assert.equal(obj0.resolved.endTime, 1050);

		var state0 = SuperTimeline.resolver.getState(clone(data), 1000);

			var sobj0 = state0.GLayers['1'];

			assert(sobj0);
			assert.equal(sobj0.id, 'obj0');
			assert(sobj0.resolved);
			assert.equal(sobj0.resolved.attributes.positionX, 0);
			assert.equal(sobj0.resolved.attributes.positionY, 0);
			assert.equal(sobj0.resolved.attributes.scale, 1);
			assert(!_.has(sobj0.resolved.attributes,'opacity'));

		var state1 = SuperTimeline.resolver.getState(clone(data), 1005);

			var sobj1 = state1.GLayers['1'];
			assert(sobj1);

			assert.equal(sobj1.resolved.attributes.positionX, 0);
			assert.equal(sobj1.resolved.attributes.positionY, 0);
			assert.equal(sobj1.resolved.attributes.scale, 0.5);
			assert.equal(sobj1.resolved.attributes.opacity, 0.5);

		var state2 = SuperTimeline.resolver.getState(clone(data), 1010);

			var sobj2 = state2.GLayers['1'];
			assert(sobj2);

			assert.equal(sobj2.resolved.attributes.positionX, 0);
			assert.equal(sobj2.resolved.attributes.positionY, 0);
			assert.equal(sobj2.resolved.attributes.scale, 1);
			assert(!_.has(sobj2.resolved.attributes,'opacity'));
	
		return data;
	},

	// test group

	// test looping group

	// test .useExternalFunctions

];


//SuperTimeline.resolver.traceLevel = SuperTimeline.enums.TraceLevel.TRACE;

// Run tests:

console.log('Running tests...');
var data = null;
try {
	_.each(tests, function (test, i) {
		console.log('Test '+i+' -------------------------------');

		data = test(data);
		
	});
	

	console.log('Tests Complete!');
	
} catch (e) {
	if (e) {
		console.log('Error',e);
	}
}
