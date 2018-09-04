
import { TriggerType, EventType, TraceLevel } from '../enums/enums'
import {
	Resolver,
	TimelineResolvedObject,
	TimelineState,
	DevelopedTimeline,
	ExternalFunctions,
	TimelineObject
} from '../resolver/resolver'
import * as _ from 'underscore'
// let assert = require('assert')
const clone = require('fast-clone')

const now = 1000

const testData = {
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
	],
	'keyframeingroup': [
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 60,
			isGroup: true,
			LLayer: 1,
			content: {
				objects: [
					{
						id: 'obj2',
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						LLayer: 2,
						duration: 60,
						content: {
							type: 'file',
							name: 'AMB',
							keyframes: [
								{
									id: 'kf1',
									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 10
									},
									duration: 10,
									content: {
										mixer: {
											opacity: 0
										}
									}
								}
							]
						}
					}
				]
			}
		}
	],
	'groupwithduration': [ // group with duration only set on group and not the child
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 30, // 30s long
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 1
					}
				]
			}
		}
	],
	'relativeduration0': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 60, // 60s
			LLayer: 1,
			classes: ['obj0Class']
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: '#obj0.duration / 2', // 30s
			LLayer: 1
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end'
			},
			duration: '#obj1.end - #obj0.start', // 90s
			LLayer: 1
		},
		{
			id: 'obj3', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj2.end'
			},
			duration: '5400 - #.start', // so it ends at 5400 (#.start = my own start time)
			LLayer: 1
		}
	],
	'relativedurationorder0': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: '#group1.start - #.start', // stop with start of child1
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 1
					}
				]
			}
		},
		{
			id: 'group1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 150
			},
			duration: 0, // infinite
			LLayer: 2,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 2
					}
				]
			}
		}
	],
	'circulardependency0': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj2.end'
			},
			duration: '0',
			LLayer: 1,
			classes: ['obj0Class']
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: '0',
			LLayer: 1
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end'
			},
			duration: 10,
			LLayer: 1
		}
	],
	'circulardependency1': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: '#obj2.end', // 60s
			LLayer: 1,
			classes: ['obj0Class']
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: '#obj0.duration / 2', // 30s
			LLayer: 1
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end'
			},
			duration: 10,
			LLayer: 1
		}
	],
	'dependenciesBetweengroupchildren': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '', // stop with start of child1
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 10,
						LLayer: 1
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 20,
						LLayer: 1
					}
				]
			}
		},
		{
			id: 'group1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#child1.end'
			},
			// duration: '', // stop with start of child1
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child2', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: '#child0.duration + #child1.duration',
						LLayer: 1
					}
				]
			}
		}
	],
	'selfreferenceexpression0': [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 10,
			LLayer: 1
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.start + 5'
			},
			duration: '#obj0.end - #.start', // make it end at the same time as obj0
			LLayer: 1
		}
	],
	'relativeStartOrder0': [
		{
			id: 'trans0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 2500,
			LLayer: 2,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 3
					}
				]
			}
		},
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 0,
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#trans0.start + 1500'
						},
						duration: 0,
						LLayer: 3
					}
				]
			}
		}
	],
	'relativePastEnd': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: '#group3.start + 100 - #.start',
			LLayer: 2,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'group2', // the id must be unique
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						duration: 0,
						LLayer: 3,
						isGroup: true,
						repeating: false,
						content: {
							objects: [
								{
									id: 'child1', // the id must be unique
									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 0 // Relative to parent object
									},
									duration: 0,
									LLayer: 4
								}
							]
						}
					},
					{
						id: 'group4', // the id must be unique
						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#group2.start + 4000' // starts after parent group has finished
						},
						duration: 2500,
						LLayer: 5,
						isGroup: true,
						repeating: false,
						content: {
							objects: [
								{
									id: 'child5', // the id must be unique
									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 0 // Relative to parent object
									},
									duration: 0,
									LLayer: 6
								}
							]
						}
					}
				]
			}
		},
		{
			id: 'group1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 3000
			},
			duration: 0,
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'group3', // the id must be unique
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						duration: 0,
						LLayer: 7,
						isGroup: true,
						repeating: false,
						content: {
							objects: [
								{
									id: 'child0', // the id must be unique
									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 0
									},
									duration: 0,
									LLayer: 8
								}
							]
						}
					}
				]
			}
		}
	],
	'manyParentheses': [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 3000
			},
			duration: 0,
			LLayer: 0
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: '((#obj0.start - #.start) - (1000 + (2000 / 2)))',
			LLayer: 1
		}
	]
}
let reverseData = false
const reverseDataObjs = (objs: Array<any>) => {
	objs = objs.reverse()
	_.each(objs, (obj) => {
		if ((obj.content || {}).objects) {
			obj.content.objects = reverseDataObjs(obj.content.objects)
		}
	})
	return objs
}
const getTestData = (dataset: string) => {
	let data = clone(testData[dataset])
	if (reverseData) {
		data = reverseDataObjs(data)
	}
	return data
}
type Tests = {[key: string]: any}
let tests: Tests = {
	'Basic timeline': () => {
		expect(() => {
			// @ts-ignore bad input
			const tl = Resolver.getTimelineInWindow()
		}).toThrowError()
		const data = getTestData('basic')
		const tl = Resolver.getTimelineInWindow(data)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified

		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(0)

		const nextEvents = Resolver.getNextEvents(data, now - 100)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

		expect(nextEvents).toHaveLength(4)
		expect(nextEvents[0]).toMatchObject({
			type: EventType.START, time: 990, obj: { id: 'obj0' }})

		expect(nextEvents[1]).toMatchObject({
			type: EventType.END, time: 1050, obj: { id: 'obj0' }})
		expect(nextEvents[2]).toMatchObject({
			type: EventType.START, time: 1050, obj: { id: 'obj1' }})

		const state = Resolver.getState(data, now)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

		expect(state.GLayers['1']).toBeTruthy() // TimelineObject
		expect(state.time).toBe(now)
		expect(state.GLayers['1'].id).toBe('obj0')
		expect(state.LLayers['1'].id).toBe('obj0')

		const state2 = Resolver.getState(tl, now)

		expect(state2.GLayers['1'].id).toBe('obj0')
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

	},
	'Basic timeline 2': () => {

		const data = getTestData('basic2')

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(0)

		const nextEvents = Resolver.getNextEvents(data, 900)
		expect(nextEvents).toHaveLength(2)
		expect(nextEvents[0].type).toBe(EventType.START)
		expect(nextEvents[0].time).toBe(950)
		expect(nextEvents[1].type).toBe(EventType.END)
		expect(nextEvents[1].time).toBe(1050)

		const state = Resolver.getState(data, 1000)

		expect(state.time).toBe(1000)
		expect(state.GLayers['10'].id).toBe('obj0')
		expect(state.LLayers['10'].id).toBe('obj0')

		const state2 = Resolver.getState(tl, 1000)

		expect(state2.GLayers['10'].id).toBe('obj0')
		expect(data).toEqual(getTestData('basic2')) // Make sure the original data is unmodified
	},
	'Basic timeline 3': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(3)
		expect(tl.unresolved).toHaveLength(0)

		const nextEvents = Resolver.getNextEvents(tl, 1000, 1) // limit
		expect(nextEvents).toHaveLength(1) // see that the limit is working
		expect(nextEvents[0].type).toBe(EventType.END)
		expect(nextEvents[0].time).toBe(1050)

		const state = Resolver.getState(tl, 1000)
		expect(state.LLayers['10'].id).toBe('obj1')
		expect(state.LLayers['11'].id).toBe('obj2')
		expect(data).toEqual(getTestData('basic2')
			.concat(getTestData('basic3'))) // Make sure the original data is unmodified
	},
	'Timeline, override object': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))

		const state = Resolver.getState(data, 1000)
		expect(state.LLayers['10'].id).toBe('obj3')
	},
	'Timeline, override object 2': () => {
		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))
			.concat(getTestData('override2'))

		const state = Resolver.getState(data, 1000)
		expect(state.LLayers['10'].id).toBe('obj5')

		const stateInFuture = Resolver.getState(data, 10000)
		expect(stateInFuture.LLayers['10'].id).toBe('obj5')
	},
	'Timeline, override object 3': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))
			.concat(getTestData('override2'))
			.concat(getTestData('override3'))

		const state = Resolver.getState(data, 1000)
		expect(state.LLayers['10'].id).toBe('obj6')

		const stateInFuture = Resolver.getState(data, 10000)
		expect(stateInFuture.LLayers['10'].id).toBe('obj5')
	},
	'Timeline, relative timing': () => {

		const data = getTestData('relative1')

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(6)
		expect(tl.unresolved).toHaveLength(1)

		const obj1 = _.find(tl.resolved, { id: 'obj1' })
		expect(obj1).toBeTruthy() // TimelineObject
		expect(obj1.resolved.startTime).toBe(1054)
		expect(obj1.resolved.endTime).toBe(1064)

		const obj2 = _.find(tl.resolved, { id: 'obj2' })
		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.startTime).toBe(1068)
		expect(obj2.resolved.endTime).toBe(1118)

		const obj3 = _.find(tl.resolved, { id: 'obj3' })
		expect(obj3).toBeTruthy() // TimelineObject
		expect(obj3.resolved.startTime).toBe(1058)
		expect(obj3.resolved.endTime).toBe(1068)

		const obj4 = _.find(tl.resolved, { id: 'obj4' })
		expect(obj4).toBeTruthy() // TimelineObject
		expect(obj4.resolved.startTime).toBe(1118)
		expect(obj4.resolved.endTime).toBe(1128)

		const obj5 = _.find(tl.resolved, { id: 'obj5' })
		expect(obj5).toBeTruthy() // TimelineObject
		expect(obj5.resolved.startTime).toBe(1123)
		expect(obj5.resolved.endTime).toBe(1133)

		const state0 = Resolver.getState(data, 1067)

		expect(state0.GLayers['10'].id).toBe('obj3')

		const state1 = Resolver.getState(data, 1068)

		expect(state1.GLayers['10'].id).toBe('obj2')

		const nextEvents = Resolver.getNextEvents(tl, 900)

		expect(nextEvents).toHaveLength(10)

		expect(nextEvents[0]).toMatchObject({
			type: EventType.START, time: 950, obj: { id: 'obj0' }})
		expect(nextEvents[1]).toMatchObject({
			type: EventType.END, time: 1050, obj: { id: 'obj0' }})
		expect(nextEvents[2]).toMatchObject({
			type: EventType.START, time: 1054, obj: { id: 'obj1' }})
		expect(nextEvents[3]).toMatchObject({
			type: EventType.START, time: 1058, obj: { id: 'obj3' }})
		expect(nextEvents[4]).toMatchObject({
			type: EventType.END, time: 1064, obj: { id: 'obj1' }})
		expect(nextEvents[5]).toMatchObject({
			type: EventType.END, time: 1068, obj: { id: 'obj3' }})
		expect(nextEvents[6]).toMatchObject({
			type: EventType.START, time: 1068, obj: { id: 'obj2' }})
		expect(nextEvents[7]).toMatchObject({
			type: EventType.END, time: 1118, obj: { id: 'obj2' }})
		expect(nextEvents[8]).toMatchObject({
			type: EventType.START, time: 1118, obj: { id: 'obj4' }})
		expect(nextEvents[9]).toMatchObject({
			type: EventType.START, time: 1123, obj: { id: 'obj5' }})

		expect(data).toEqual(getTestData('relative1')) // Make sure the original data is unmodified
	},
	'Timeline, relative timing 2': () => {

		const data = getTestData('relative2')

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(1)

		const obj2 = _.find(tl.resolved, { id: 'obj2' })
		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.startTime).toBe(965)
		expect(obj2.resolved.endTime).toBe(1015)

		const state0 = Resolver.getState(data, 1000)

		expect(state0.GLayers['10'].id).toBe('obj2')

		const state1 = Resolver.getState(data, 2000)

		expect(state1.GLayers['10'].id).toBe('obj0')
	},
	'Timeline, relative timing and keyframes': () => {
		const data = getTestData('keyframes1')

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(3)
		expect(tl.unresolved).toHaveLength(0)

		const obj2 = _.find(tl.resolved, { id: 'obj2' })

		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.startTime).toBe(965)
		expect(obj2.resolved.endTime).toBe(1015)

		const obj3 = _.find(tl.resolved, { id: 'obj3' })

		expect(obj3).toBeTruthy() // TimelineObject
		expect(obj3.resolved.startTime).toBe(985)

		const nextEvents0 = Resolver.getNextEvents(data, 100)
		expect(nextEvents0).toHaveLength(10)
		const nextEvents1 = Resolver.getNextEvents(data, 2000)
		expect(nextEvents1).toHaveLength(0)

		const state0 = Resolver.getState(data, 966)

		let sobj2 = state0.GLayers['10']

		expect(sobj2.id).toBe('obj2')
		expect(sobj2.resolved.mixer.opacity).toBe(0.1)
		expect(sobj2.resolved.mixer.brightness).toBe(0.1)
		expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy()

		const state1 = Resolver.getState(data, 967)

		sobj2 = state1.GLayers['10']

		expect(sobj2.resolved.mixer.opacity).toBe(0.2)
		expect(sobj2.resolved.mixer.brightness).toBe(0.1)
		expect(sobj2.resolved.mixer.myCustomAttribute).toBeFalsy()

		const state2 = Resolver.getState(data, 984)

		sobj2 = state2.GLayers['10']

		expect(sobj2.resolved.mixer.opacity).toBe(0.3)
		expect(sobj2.resolved.mixer.myCustomAttribute).toBe(1)

		expect(data).toEqual(getTestData('keyframes1')) // Make sure the original data is unmodified
	},
	'Timeline, absolute keyframe': () => {

		const data = getTestData('abskeyframe')

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(0)

		const obj0 = _.find(tl.resolved, { id: 'obj0' })

		expect(obj0).toBeTruthy() // TimelineObject
		expect(obj0.resolved.startTime).toBe(1000)
		expect(obj0.resolved.endTime).toBe(1050)

		const state0 = Resolver.getState(clone(data), 1000)

		const sobj0 = state0.GLayers['1']

		expect(sobj0).toBeTruthy() // TimelineResolvedObject
		expect(sobj0.id).toBe('obj0')
		expect(sobj0.resolved).toBeTruthy() // TimelineResolvedObject

		expect(sobj0.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		})
		expect(sobj0.resolved.attributes.opacity).toBeFalsy()

		const state1 = Resolver.getState(clone(data), 1005)

		const sobj1 = state1.GLayers['1']
		expect(sobj1).toBeTruthy() // TimelineResolvedObject
		expect(sobj1.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		0.5,
			opacity: 	0.5
		})

		const state2 = Resolver.getState(clone(data), 1010)

		const sobj2 = state2.GLayers['1']
		expect(sobj2).toBeTruthy() // TimelineResolvedObject
		expect(sobj2.resolved.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		})

		expect(sobj2.resolved.attributes).toBeTruthy()
		expect(sobj2.resolved.attributes.opacity).toBeFalsy()

		expect(data).toEqual(getTestData('abskeyframe')) // Make sure the original data is unmodified
	},
	'logical objects, references': () => {

		const data = getTestData('basic')
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

		const state0 = Resolver.getState(clone(data), now)

		expect(state0.GLayers['1']).toBeTruthy() // TimelineResolvedObject
		expect(state0.GLayers['1'].id).toBe('obj0')

		expect(state0.GLayers['2']).toBeTruthy() // TimelineResolvedObject
		expect(state0.GLayers['2'].id).toBe('logical0')

		expect(state0.GLayers['3']).toBeTruthy() // TimelineResolvedObject
		expect(state0.GLayers['3'].id).toBe('logical1')

		expect(state0.GLayers['4']).toBeTruthy() // TimelineResolvedObject
		expect(state0.GLayers['4'].id).toBe('logical2')

		const state1 = Resolver.getState(clone(data), now + 1000)

		expect(state1.GLayers['2']).toBeTruthy() // TimelineResolvedObject
		expect(state1.GLayers['3']).toBeFalsy() // TimelineResolvedObject
		expect(state1.GLayers['4']).toBeTruthy() // TimelineResolvedObject

		expect(data).toEqual(getTestData('basic')
			.concat(getTestData('logical1'))) // Make sure the original data is unmodified
	},
	'logical objects, references 2': () => {

		const data = getTestData('basic')
			.concat(getTestData('logical2'))

		// let tl = Resolver.getTimelineInWindow(data)

		const state0 = Resolver.getState(clone(data), now)

		expect(state0.GLayers['1']).toBeTruthy()
		expect(state0.GLayers['2']).toBeTruthy()
		expect(state0.GLayers['3']).toBeFalsy()

		const state1 = Resolver.getState(clone(data), now + 1000)

		expect(state1.GLayers['1']).toBeFalsy() // TimelineResolvedObject
		expect(state1.GLayers['2']).toBeFalsy() // TimelineResolvedObject
		expect(state1.GLayers['3']).toBeTruthy() // TimelineResolvedObject

		expect(data).toEqual(getTestData('basic')
			.concat(getTestData('logical2'))) // Make sure the original data is unmodified
	},
	'logical objects, references 3': () => {

		const data = getTestData('basic')
			.concat(getTestData('logical3'))

		// let tl = Resolver.getTimelineInWindow(data)
		try {
			const state0 = Resolver.getState(clone(data), now)

			expect(state0.GLayers['1']).toBeTruthy()
			expect(state0.GLayers['2']).toBeTruthy()
			expect(state0.GLayers['3']).toBeFalsy()

			const state1 = Resolver.getState(clone(data), now + 1000)

			expect(state1.GLayers['1']).toBeFalsy() // TimelineResolvedObject
			expect(state1.GLayers['2']).toBeFalsy() // TimelineResolvedObject
			expect(state1.GLayers['3']).toBeTruthy() // TimelineResolvedObject
		} catch (e) {
			console.log(e, e.stack)
		}
	},
	'setTraceLevel': () => {
		Resolver.setTraceLevel(TraceLevel.INFO)
		expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

		Resolver.setTraceLevel(TraceLevel.ERRORS)
		expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)

		Resolver.setTraceLevel('INFO')
		expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

		Resolver.setTraceLevel('asdf')
		expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)
	},
	'getObjectsInWindow': () => {
		const data = clone(getTestData('basic'))

		const tld = Resolver.getObjectsInWindow(clone(data), now - 10, now + 10)

		expect(tld.resolved).toHaveLength(1)
		expect(tld.unresolved).toHaveLength(0)

		expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified
	},
	'External functions': () => {
		const data = clone(getTestData('basic'))

		const state0 = Resolver.getState(data, now)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified

		expect(state0.LLayers['1']).toBeTruthy() // TimelineObject
		expect(state0.LLayers['1'].id).toBe('obj0')

		const obj0: TimelineObject = _.findWhere(data, { id: 'obj0' })
		obj0.externalFunction = 'ext0'

		const externalFunctions0: ExternalFunctions = {
			'ext0': jest.fn((resolvedObj: TimelineResolvedObject, state: TimelineState, tld: DevelopedTimeline) => {
				// disable this object
				resolvedObj.resolved.disabled = true
				state = state
				tld = tld

				return true
			})
		}

		const state1 = Resolver.getState(data, now, externalFunctions0)

		expect(externalFunctions0.ext0).toHaveBeenCalledTimes(1)

		expect(state1.LLayers['1']).toBeFalsy() // TimelineObject

	},
	'Expressions': () => {

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
			)
		}).toThrowError()
		expect(() => {
			Resolver.resolveLogicalExpression(
				Resolver.interpretExpression('5 * ') // unbalanced expression
			)
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

		expect(() => {
			Resolver.resolveLogicalExpression(
				Resolver.interpretExpression('14 + #badReference.start', true)
			)
		}).toThrowError()

		const data = clone(getTestData('logical1'))
		const state: TimelineState = {
			time: now,
			GLayers: {},
			LLayers: {}
		}
		const val = Resolver.decipherLogicalValue('1', data[0], state)
		expect(val).toBeTruthy()

	},
	'disabled objects on timeline': () => {

		const data = clone(getTestData('basic'))
		const obj0: TimelineObject = _.findWhere(data, { id: 'obj0' })
		obj0.disabled = true

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(0)

		const state0 = Resolver.getState(tl, now)

		expect(state0.LLayers['1']).toBeFalsy()
	},
	'object with infinite duration': () => {

		const data = clone(getTestData('infiniteduration'))

		const tl = Resolver.getTimelineInWindow(data)

		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(1) // because obj0 has infinite duration

		const state0 = Resolver.getState(tl, now)

		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toBe('obj0')
	},
	'bad objects on timeline': () => {

		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].id
			Resolver.getState(clone(data), now)
		}).toThrowError()

		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].trigger
			Resolver.getState(clone(data), now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].trigger.type
			Resolver.getState(clone(data), now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].LLayer
			Resolver.getState(clone(data), now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			data[0].id = 'asdf'
			data[1].id = 'asdf' // should be unique
			Resolver.getState(clone(data), now)
		}).toThrowError()

		expect(() => {
			const data = clone(getTestData('simplegroup'))
			delete data[0].content.objects
			Resolver.getState(clone(data), now)
		}).toThrowError()
	},
	'simple group': () => {
		const data = clone(getTestData('simplegroup'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(data).toEqual(getTestData('simplegroup')) // Make sure the original data is unmodified
		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(0)

		const tld = Resolver.developTimelineAroundTime(tl, now)
		expect(tld.resolved).toHaveLength(3)
		expect(tld.unresolved).toHaveLength(0)

		const child0: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child0' })
		const child1: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child1' })
		const obj1: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'obj1' })

		expect(child0.resolved.startTime).toBe(990)
		expect(child0.resolved.endTime).toBe(1005)
		expect(child1.resolved.startTime).toBe(1005)
		expect(child1.resolved.endTime).toBe(1015)
		expect(obj1.resolved.startTime).toBe(1050)

		const events0 = Resolver.getNextEvents(tl, now)
		// console.log('tld', tld.resolved)
		// console.log('events0', events0)
		expect(events0).toHaveLength(5)
		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['2']).toBeTruthy()
		expect(state0.GLayers['2']).toBeTruthy()
		expect(state0.LLayers['2'].id).toBe('child0')

		const events1 = Resolver.getNextEvents(tl, now + 10)
		expect(events1).toHaveLength(3)
		const state1 = Resolver.getState(tl, now + 10)
		expect(state1.LLayers['2']).toBeTruthy()
		expect(state1.GLayers['2']).toBeTruthy()
		expect(state1.LLayers['2'].id).toBe('child1')

		const events2 = Resolver.getNextEvents(tl, now + 25)
		expect(events2).toHaveLength(2)
		const state2 = Resolver.getState(tl, now + 25)
		expect(state2.LLayers['2']).toBeFalsy()
		expect(state2.GLayers['2']).toBeFalsy()

		const state3 = Resolver.getState(tl, now + 60)
		expect(state3.LLayers['2']).toBeTruthy()
		expect(state3.GLayers['2']).toBeTruthy()
		expect(state3.LLayers['2'].id).toBe('obj1')

		expect(data).toEqual(getTestData('simplegroup')) // Make sure the original data was unmodified
	},
	'repeating group': () => {

		const data = clone(getTestData('repeatinggroup'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(0)

		const tld0 = Resolver.developTimelineAroundTime(tl, now)
		expect(tld0.resolved).toHaveLength(3)
		expect(tld0.resolved[0].id).toBe('child0')
		expect(tld0.resolved[0].resolved.startTime).toBe(990)
		expect(tld0.resolved[1].id).toBe('child1')
		expect(tld0.resolved[1].resolved.startTime).toBe(1005)

		const events0 = Resolver.getNextEvents(tl, now)
		expect(events0).toHaveLength(5)
		expect(events0[0]).toMatchObject({
			type: EventType.END, time: 1005, obj: { id: 'child0' }})
		expect(events0[1]).toMatchObject({
			type: EventType.START, time: 1005, obj: { id: 'child1' }})
		expect(events0[2]).toMatchObject({
			type: EventType.END, time: 1015, obj: { id: 'child1' }})

		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toBe('child0')

		const tld1 = Resolver.developTimelineAroundTime(tl, now + 10)
		expect(tld1.resolved).toHaveLength(3)
		expect(tld1.resolved[0].id).toBe('child1')
		expect(tld1.resolved[0].resolved.startTime).toBe(1005)
		expect(tld1.resolved[1].id).toBe('child0')
		expect(tld1.resolved[1].resolved.startTime).toBe(1015)
		const events1 = Resolver.getNextEvents(tl, now + 10)
		expect(events1).toHaveLength(5)
		expect(events1[0]).toMatchObject({
			type: EventType.END, time: 1015, obj: { id: 'child1' }})
		expect(events1[1]).toMatchObject({
			type: EventType.START, time: 1015, obj: { id: 'child0' }})
		expect(events1[2]).toMatchObject({
			type: EventType.END, time: 1030, obj: { id: 'child0' }})

		const state1 = Resolver.getState(tl, now + 10)
		expect(state1.LLayers['1']).toBeTruthy()
		expect(state1.LLayers['1'].id).toBe('child1')

		// Next loop:
		const tld2 = Resolver.developTimelineAroundTime(tl, now + 25)
		expect(tld2.resolved).toHaveLength(3)
		expect(tld2.resolved[0].id).toBe('child0')
		expect(tld2.resolved[0].resolved.startTime).toBe(1015)
		expect(tld2.resolved[1].id).toBe('child1')
		expect(tld2.resolved[1].resolved.startTime).toBe(1030)
		const events2 = Resolver.getNextEvents(tl, now + 25)
		expect(events2).toHaveLength(5)
		expect(events2[0]).toMatchObject({
			type: EventType.END, time: 1030, obj: { id: 'child0' }})
		expect(events2[1]).toMatchObject({
			type: EventType.START, time: 1030, obj: { id: 'child1' }})
		expect(events2[2]).toMatchObject({
			type: EventType.END, time: 1040, obj: { id: 'child1' }})

		const state2 = Resolver.getState(tl, now + 25)
		expect(state2.LLayers['1']).toBeTruthy()
		expect(state2.LLayers['1'].id).toBe('child0')

		const state3 = Resolver.getState(tl, now + 35)
		expect(state3.LLayers['1']).toBeTruthy()
		expect(state3.LLayers['1'].id).toBe('child1')
		const events3 = Resolver.getNextEvents(tl, now + 35)
		expect(events3).toHaveLength(5)

		// just before group0 is done:
		// let tld4 = Resolver.developTimelineAroundTime(tl, now + 50)
		const events4 = Resolver.getNextEvents(tl, now + 50)
		expect(events4[0]).toMatchObject({
			type: EventType.END, time: 1053, obj: { id: 'child0' }})
		expect(events4[1]).toMatchObject({
			type: EventType.START, time: 1053, obj: { id: 'obj1' }})
		expect(events4[2]).toMatchObject({
			type: EventType.END, time: 1070, obj: { id: 'obj1' }})

		expect(data).toEqual(getTestData('repeatinggroup')) // Make sure the original data is unmodified

	},
	'repeating group in repeating group': () => {

		const data = clone(getTestData('repeatinggroupinrepeatinggroup'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(2)
		expect(tl.unresolved).toHaveLength(0)

		expect(data).toEqual(getTestData('repeatinggroupinrepeatinggroup')) // Make sure the original data is unmodified

		const tld0 = Resolver.developTimelineAroundTime(tl, now)

		expect(data).toEqual(getTestData('repeatinggroupinrepeatinggroup')) // Make sure the original data is unmodified

		expect(tld0.resolved).toHaveLength(4)
		expect(tld0.groups).toHaveLength(2)
		expect(tld0.unresolved).toHaveLength(0)

		expect(tld0.resolved[0]).toMatchObject({
			id: 'child0', resolved:  { startTime: 1000 }})
		expect(tld0.resolved[1]).toMatchObject({
			id: 'child1', resolved:  { startTime: 1030 }})
		expect(tld0.resolved[2]).toMatchObject({
			id: 'child2', resolved:  { startTime: 1040 }})
		expect(tld0.resolved[3]).toMatchObject({
			id: 'obj1', resolved:  { startTime: 1300 }})

		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toBe('child0')

		expect(data).toEqual(getTestData('repeatinggroupinrepeatinggroup')) // Make sure the original data is unmodified

		const events0 = Resolver.getNextEvents(tl, now)
		expect(events0).toHaveLength(8)
		expect(events0[0]).toMatchObject({
			type: EventType.START, time: 1000, obj: { id: 'child0' }})
		expect(events0[1]).toMatchObject({
			type: EventType.END, time: 1030, obj: { id: 'child0' }})
		expect(events0[2]).toMatchObject({
			type: EventType.START, time: 1030, obj: { id: 'child1' }})
		expect(events0[3]).toMatchObject({
			type: EventType.END, time: 1040, obj: { id: 'child1' }})
		expect(events0[4]).toMatchObject({
			type: EventType.START, time: 1040, obj: { id: 'child2' }})
		expect(events0[5]).toMatchObject({
			type: EventType.END, time: 1055, obj: { id: 'child2' }})
		expect(events0[6]).toMatchObject({
			type: EventType.START, time: 1300, obj: { id: 'obj1' }})
		expect(events0[7]).toMatchObject({
			type: EventType.END, time: 1360, obj: { id: 'obj1' }})

		// a bit in:
		const state1 = Resolver.getState(tl, now + 50)
		expect(state1.LLayers['1']).toBeTruthy()
		expect(state1.LLayers['1'].id).toBe('child2')

		const events1 = Resolver.getNextEvents(tl, now + 50)
		expect(events1).toHaveLength(7)
		expect(events1[0]).toMatchObject({
			type: EventType.END, time: 1055, obj: { id: 'child2' }})
		expect(events1[1]).toMatchObject({
			type: EventType.START, time: 1055, obj: { id: 'child1' }})
		expect(events1[2]).toMatchObject({
			type: EventType.END, time: 1065, obj: { id: 'child1' }})

		// just before group1 is done playing:
		const state2 = Resolver.getState(tl, now + 91)
		expect(state2.LLayers['1']).toBeTruthy()
		expect(state2.LLayers['1'].id).toBe('child2')

		const events2 = Resolver.getNextEvents(tl, now + 91)

		expect(events2[0]).toMatchObject({
			type: EventType.END, time: 1092, obj: { id: 'child2' }})
		expect(events2[1]).toMatchObject({
			type: EventType.START, time: 1092, obj: { id: 'child0' }})
		expect(events2[2]).toMatchObject({
			type: EventType.END, time: 1122, obj: { id: 'child0' }})

		expect(data).toEqual(getTestData('repeatinggroupinrepeatinggroup')) // Make sure the original data is unmodified
	},
	'test group with duration and infinite child': () => {

		const data = clone(getTestData('groupwithduration'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(0)

		const tld0 = Resolver.developTimelineAroundTime(tl, now)

		expect(tld0.resolved).toHaveLength(1)
		expect(tld0.groups).toHaveLength(1)
		expect(tld0.unresolved).toHaveLength(0)

		expect(tld0.resolved[0]).toMatchObject({
			id: 'child0', resolved:  { startTime: 1000 }})

		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toBe('child0')

		const events0 = Resolver.getNextEvents(tl, now)
		expect(events0).toHaveLength(2)
		expect(events0[0]).toMatchObject({
			type: EventType.START, time: 1000, obj: { id: 'child0' }})
		expect(events0[1]).toMatchObject({
			type: EventType.END, time: 1030, obj: { id: 'child0' }})

		// a bit in:
		const state1 = Resolver.getState(tl, now + 50)
		expect(state1.LLayers['1']).toBeFalsy()

		const events1 = Resolver.getNextEvents(tl, now + 50)
		expect(events1).toHaveLength(0)

		// just before group1 is done playing:
		const state2 = Resolver.getState(tl, now + 29)
		expect(state2.LLayers['1']).toBeTruthy()
		expect(state2.LLayers['1'].id).toBe('child0')

		const events2 = Resolver.getNextEvents(tl, now + 29)

		expect(events2[0]).toMatchObject({
			type: EventType.END, time: 1030, obj: { id: 'child0' }})

		expect(data).toEqual(getTestData('groupwithduration')) // Make sure the original data is unmodified
	},
	'infinite group': () => {
		const data = clone(getTestData('infinitegroup'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(0)

		const tld = Resolver.developTimelineAroundTime(tl, now)
		expect(tld.resolved).toHaveLength(2)
		expect(tld.unresolved).toHaveLength(0)

		const events0 = Resolver.getNextEvents(tl, now)
		expect(events0).toHaveLength(3)
		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toBe('child0')

		expect(data).toEqual(getTestData('infinitegroup')) // Make sure the original data is unmodified
	},
	'logical objects in group': () => {
		const data = clone(getTestData('logicalInGroup'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(1)
		expect(tl.unresolved).toHaveLength(2)

		const tld = Resolver.developTimelineAroundTime(tl, now)
		expect(tld.resolved).toHaveLength(1)
		expect(tld.unresolved).toHaveLength(2)

		const events0 = Resolver.getNextEvents(tl, now)
		expect(events0).toHaveLength(0)
		// Resolver.setTraceLevel(TraceLevel.TRACE)
		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['2']).toBeTruthy()
		expect(state0.GLayers['2']).toBeTruthy()
		expect(state0.LLayers['2'].id).toBe('child0')

		expect(state0.LLayers['3']).toBeTruthy()
		expect(state0.GLayers['3']).toBeTruthy()
		expect(state0.LLayers['3'].id).toBe('outside0')

		expect(data).toEqual(getTestData('logicalInGroup')) // Make sure the original data is unmodified
	},
	'logical objects in group with logical expr': () => {
		const data = clone(getTestData('logicalInGroupLogical'))

		const tl = Resolver.getTimelineInWindow(data)
		expect(data).toEqual(getTestData('logicalInGroupLogical')) // Make sure the original data is unmodified
		// expect(tl.resolved).toHaveLength(1)
		// expect(tl.unresolved).toHaveLength(1)

		// let tld = Resolver.developTimelineAroundTime(tl, now)
		// expect(tld.resolved).toHaveLength(2)
		// expect(tld.unresolved).toHaveLength(1)

		// let events0 = Resolver.getNextEvents(tl, now)
		// expect(events0).toHaveLength(0)
		// Resolver.setTraceLevel(TraceLevel.TRACE)
		const state0 = Resolver.getState(tl, now)
		expect(state0.LLayers['2']).toBeTruthy()
		expect(state0.GLayers['2']).toBeTruthy()
		expect(state0.LLayers['2'].id).toBe('child0')

		expect(state0.LLayers['4']).toBeFalsy()
		expect(state0.GLayers['4']).toBeFalsy()

		expect(data).toEqual(getTestData('logicalInGroupLogical')) // Make sure the original data is unmodified
	},
	'keyframe in a grouped object': () => {
		const data = clone(getTestData('keyframeingroup'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(1)

		const events = Resolver.getNextEvents(data, 1000, 4)
		expect(events.length).toEqual(4)
		expect(events[1].time).toEqual(1010)
		expect(events[2].time).toEqual(1020)

		const state0 = Resolver.getState(data, 1015)

		expect(state0.LLayers['2']).toBeTruthy()
		const obj2 = state0.LLayers['2']

		expect(obj2.resolved.mixer.opacity).toEqual(0)
	},
	'relative durations': () => {
		const data = clone(getTestData('relativeduration0'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(4)

		const events = Resolver.getNextEvents(data, 1000)
		expect(events.length).toEqual(8)
		expect(events[0].time).toEqual(1000)
		expect(events[1].time).toEqual(1060)
		expect(events[2].time).toEqual(1060)
		expect(events[3].time).toEqual(1090)
		expect(events[4].time).toEqual(1090)
		expect(events[5].time).toEqual(1180)
		expect(events[6].time).toEqual(1180)
		expect(events[7].time).toEqual(5400)

		const state0 = Resolver.getState(data, 1030)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toEqual('obj0')

		const state1 = Resolver.getState(data, 1070)
		expect(state1.LLayers['1']).toBeTruthy()
		expect(state1.LLayers['1'].id).toEqual('obj1')

		const state2 = Resolver.getState(data, 1100)
		expect(state2.LLayers['1']).toBeTruthy()
		expect(state2.LLayers['1'].id).toEqual('obj2')

		const state3 = Resolver.getState(data, 1190)
		expect(state3.LLayers['1']).toBeTruthy()
		expect(state3.LLayers['1'].id).toEqual('obj3')

		const state4 = Resolver.getState(data, 5390)
		expect(state4.LLayers['1']).toBeTruthy()
		expect(state4.LLayers['1'].id).toEqual('obj3')

		const state5 = Resolver.getState(data, 5401)
		expect(state5.LLayers['1']).toBeFalsy()
	},
	'Circular dependency 1': () => {
		// console.log('======')
		// Resolver.setTraceLevel(TraceLevel.TRACE)
		const data = clone(getTestData('circulardependency0'))
		const tl = Resolver.getTimelineInWindow(data)
		// Resolver.setTraceLevel(TraceLevel.ERRORS)
		expect(tl.resolved).toHaveLength(0)

		// const obj0: TimelineResolvedObject = _.findWhere(data, { id: 'obj0' })
		// obj0.duration = 10 // break the circular dependency

		// const tl2 = Resolver.getTimelineInWindow(data)
		// expect(tl2.resolved).toHaveLength(3)
	},
	'Circular dependency 2': () => {
		const data = clone(getTestData('circulardependency1'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(0)

		const obj0: TimelineResolvedObject = _.findWhere(data, { id: 'obj0' })
		obj0.duration = 10 // break the circular dependency

		const tl2 = Resolver.getTimelineInWindow(data)
		expect(tl2.resolved).toHaveLength(3)
	},
	'relative durations object order': () => {
		const data = clone(getTestData('relativedurationorder0'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(2)
		const tld = Resolver.developTimelineAroundTime(tl, now)
		expect(tld.resolved).toHaveLength(2)

		const child0: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child0' })
		const child1: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child1' })

		expect(child0.resolved.startTime).toBe(1000)
		expect(child0.resolved.endTime).toBe(1150)
		expect(child1.resolved.startTime).toBe(1150)
		expect(child1.resolved.endTime).toBe(0)

		const events = Resolver.getNextEvents(data, 1000)
		expect(events.length).toEqual(3)
		expect(events[0].time).toEqual(1000)
		expect(events[1].time).toEqual(1150)
		expect(events[2].time).toEqual(1150)

		const state0 = Resolver.getState(data, 1030)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toEqual('child0')
		expect(state0.LLayers['2']).toBeFalsy()

		const state1 = Resolver.getState(data, 1170)
		expect(state1.LLayers['2']).toBeTruthy()
		expect(state1.LLayers['2'].id).toEqual('child1')
		expect(state1.LLayers['1']).toBeFalsy()
	},
	'Cross-dependencies between group children': () => {
		const data = clone(getTestData('dependenciesBetweengroupchildren'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(2)

		const group0: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'group0' })
		const group1: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'group1' })

		expect(group0.resolved.startTime).toBe(1000)
		expect(group1.resolved.startTime).toBe(1030)

		const tld = Resolver.developTimelineAroundTime(tl, now)
		expect(tld.resolved).toHaveLength(3)

		const child0: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child0' })
		const child1: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child1' })
		const child2: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child2' })

		expect(child0.resolved.startTime).toBe(1000)
		expect(child0.resolved.endTime).toBe(1010)
		expect(child1.resolved.startTime).toBe(1010)
		expect(child1.resolved.endTime).toBe(1030)
		expect(child2.resolved.startTime).toBe(1030)
		expect(child2.resolved.endTime).toBe(1060)

		const events = Resolver.getNextEvents(data, 1000)
		expect(events.length).toEqual(6)
		expect(events[0].time).toEqual(1000)
		expect(events[1].time).toEqual(1010)
		expect(events[2].time).toEqual(1010)
		expect(events[3].time).toEqual(1030)
		expect(events[4].time).toEqual(1030)
		expect(events[5].time).toEqual(1060)

		const state0 = Resolver.getState(data, 1005)
		expect(state0.LLayers['1']).toBeTruthy()
		expect(state0.LLayers['1'].id).toEqual('child0')

		const state1 = Resolver.getState(data, 1015)
		expect(state1.LLayers['1']).toBeTruthy()
		expect(state1.LLayers['1'].id).toEqual('child1')

		const state2 = Resolver.getState(data, 1040)
		expect(state2.LLayers['1']).toBeTruthy()
		expect(state2.LLayers['1'].id).toEqual('child2')
	},
	'self-reference expression': () => {
		const data = clone(getTestData('selfreferenceexpression0'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(2)

		const obj0 = _.findWhere(tl.resolved, { id: 'obj0' })
		const obj1 = _.findWhere(tl.resolved, { id: 'obj1' })

		expect(obj0.resolved.startTime).toEqual(1000)
		expect(obj0.resolved.endTime).toEqual(1010)

		expect(obj1.resolved.startTime).toEqual(1005)
		expect(obj1.resolved.endTime).toEqual(1010)
	},
	'large dataset': () => {
		// worst-case dataset: only relative objects, in random order
		const size = 100
		let data: any[] = []
		for (let i = 0; i < size; i++) {
			data.push({
				id: 'obj' + i,
				trigger: (
					i === 0 ?
					{
						type: TriggerType.TIME_ABSOLUTE,
						value: now
					} :
					{
						type: TriggerType.TIME_RELATIVE,
						value: '#obj' + (i - 1) + '.end'
					}
				),
				duration: 10,
				LLayer: 1
			})
		}
		data = _.sortBy(data, Math.random)

		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.resolved).toHaveLength(size)

		// const obj0 = _.findWhere(tl.resolved, { id: 'obj0' })
		// const obj1 = _.findWhere(tl.resolved, { id: 'obj1' })

		// expect(obj0.resolved.startTime).toEqual(1000)
		// expect(obj0.resolved.endTime).toEqual(1010)

		// expect(obj1.resolved.startTime).toEqual(1005)
		// expect(obj1.resolved.endTime).toEqual(1010)
	},
	'Relative start order': () => {
		const data = clone(getTestData('relativeStartOrder0'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.unresolved).toHaveLength(0)
		expect(tl.resolved).toHaveLength(2)

		const group0: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'group0' })
		const trans0: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'trans0' })

		expect(group0.resolved.startTime).toBe(1000)
		expect(group0.resolved.outerDuration).toBe(0)

		expect(trans0.resolved.startTime).toBe(1000)
		expect(trans0.resolved.outerDuration).toBe(2500)

		const tld = Resolver.developTimelineAroundTime(tl, 1500)
		expect(tld.resolved).toHaveLength(2)

		const child0: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child0' })
		const child1: TimelineResolvedObject = _.findWhere(tld.resolved, { id: 'child1' })

		expect(child0.resolved.startTime).toBe(2500)
		expect(child0.resolved.outerDuration).toBe(0)

		expect(child1.resolved.startTime).toBe(1000)
		expect(child1.resolved.outerDuration).toBe(0)

		const state0 = Resolver.getState(data, 1500)
		expect(state0.LLayers['3']).toBeTruthy()
		expect(state0.LLayers['3'].id).toEqual('child1')

		const state1 = Resolver.getState(data, 3500)
		expect(state1.LLayers['3']).toBeTruthy()
		expect(state1.LLayers['3'].id).toEqual('child0')

		const state2 = Resolver.getState(data, 4500)
		expect(state2.LLayers['3']).toBeTruthy()
		expect(state2.LLayers['3'].id).toEqual('child0')
	},
	'Relative with something past the end': () => {
		const data = clone(getTestData('relativePastEnd'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.unresolved).toHaveLength(0)
		expect(tl.resolved).toHaveLength(2)

		const group0: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'group0' })
		const group1: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'group1' })

		expect(group0.resolved.startTime).toBe(1000)
		expect(group0.resolved.outerDuration).toBe(3100)

		expect(group1.resolved.startTime).toBe(4000)
		expect(group1.resolved.outerDuration).toBe(0)

		const events = Resolver.getNextEvents(data, 1000)
		expect(events.length).toEqual(3)
		expect(events[0].obj.id).toEqual('child1')
		expect(events[0].time).toEqual(1000)
		expect(events[1].obj.id).toEqual('child0')
		expect(events[1].time).toEqual(4000)
		expect(events[2].obj.id).toEqual('child1')
		expect(events[2].time).toEqual(4100)

		const state0 = Resolver.getState(data, 5500)
		expect(state0.LLayers['4']).toBeFalsy()
		expect(state0.LLayers['6']).toBeFalsy()
	},
	'Many parentheses': () => {
		const data = clone(getTestData('manyParentheses'))
		const tl = Resolver.getTimelineInWindow(data)
		expect(tl.unresolved).toHaveLength(0)
		expect(tl.resolved).toHaveLength(2)

		const obj0: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'obj0' })
		const obj1: TimelineResolvedObject = _.findWhere(tl.resolved, { id: 'obj1' })

		expect(obj0.resolved.startTime).toBe(4000)
		expect(obj0.resolved.outerDuration).toBe(0)

		expect(obj1.resolved.startTime).toBe(1000)
		expect(obj1.resolved.outerDuration).toBe(1000)
	}
}
const onlyTests: Tests = {}
_.each(tests, (t, key: string) => {
	if ((key.match(/^only/))) {
		onlyTests[key] = t
	}
})
if (!_.isEmpty(onlyTests)) tests = onlyTests

describe('All tests', () => {
	_.each(tests, (t, key) => {
		test(key, () => {
			reverseData = false
			t()
		})
	})
})
describe('Tests with reversed data', () => {
	_.each(tests, (t, key) => {
		test(key, () => {
			reverseData = true
			t()
		})
	})
})

// TOOD: test group

// TODO: test looping group

// TODO: test .useExternalFunctions
