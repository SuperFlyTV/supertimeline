/**
 * Note: The tests in this file where originally created for version 1, but has been converted to apply for version 2
 */
import { TriggerType, EventType } from './legacyEnums.spec'
import {
	TimelineObject,
	TimelineKeyframe
} from './legacyAPI.spec'
import {
	ResolvedTimelineObject as NewResolvedTimelineObject,
	TimelineObject as NewTimelineObject,
	TimelineKeyframe as NewTimelineKeyframe,
	ResolveOptions
} from '../api/api'
import {
	Resolver
} from '../resolver/resolver'

import * as _ from 'underscore'
import { resetId } from '../lib'
// let assert = require('assert')
const clone0 = require('fast-clone')
function clone<T> (o: T): T {
	return clone0(o)
}
const now = 1000

const testDataOld: {
	[dataset: string]: Array<TimelineObject>
} = {
	'basic': [
		{
			id: 'obj0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			classes: ['obj0Class', 'L1'],
			content: {}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			content: {},
			classes: ['L1']
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
				value: '#obj0.end + (9 * 2)'
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
							value: '1' // relative to parent start time // 966
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
							value: '#K0.start + 1' // 967
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
							value: '#obj3.start - 1' // 986
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
				value: '#obj0.start + 15' // 965
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
				value: '#obj2.start + 20' // 985
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
				value: '.L1'
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
				value: '!.L1'
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
				value: '$1' // LLayer 1
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
				value: '!$1' // GLayer 1
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
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end' // will essentially never play
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			content: {}
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
						LLayer: 2,
						content: {}
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 10,
						LLayer: 2,
						content: {}
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
			LLayer: 2,
			content: {}
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
						LLayer: 2,
						content: {}
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 10,
						LLayer: 2,
						content: {}
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
				value: now - 10 // 10 seconds ago, 990
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
						LLayer: 2,
						content: {}
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
			LLayer: 3,
			content: {}
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
						LLayer: 2,
						content: {}
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
						LLayer: 4,
						content: {}
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
				value: now - 10 // 10 seconds ago // 990
			},
			duration: 63, // 63 seconds
			LLayer: '0',
			isGroup: true,
			repeating: true,
			// @ts-ignore
			legacyRepeatingTime: '25', // to work with the breaking change to repeating
			content: {
				objects: [
					{
						id: 'child0', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object // 990
						},
						duration: 15,
						LLayer: 1,
						content: {}
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end' // 1005
						},
						duration: 10, // 1015
						LLayer: 1,
						content: {}
					}
				]
			}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#group0.end'
			},
			duration: 6,
			LLayer: 1,
			content: {}
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

			// @ts-ignore
			legacyRepeatingTime: '92', // to work with the breaking change to repeating

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
						LLayer: 1,
						content: {}
					},
					{
						id: 'group1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 62, // 62 seconds
						// @ts-ignore
						legacyRepeatingTime: '25', // to work with the breaking change to repeating
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
									LLayer: 1,
									content: {}
								},
								{
									id: 'child2', // the id must be unique

									trigger: {
										type: TriggerType.TIME_RELATIVE,
										value: '#child1.end'
									},
									duration: 20,
									LLayer: 1,
									content: {}
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
				value: '#group0.end'
			},
			duration: 60, // 1 minute long
			LLayer: 1,
			content: {}
		}
	],
	'keyframeingroup': [
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now /// 1000
			},
			duration: 60, // 1060
			isGroup: true,
			LLayer: 1,
			content: {
				objects: [
					{
						id: 'obj2',
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // 1000
						},
						LLayer: 2,
						duration: 60, // 1060
						content: {
							type: 'file',
							name: 'AMB',
							keyframes: [
								{
									id: 'kf1',
									trigger: {
										type: TriggerType.TIME_ABSOLUTE,
										value: 10 // 1010
									},
									duration: 10,
									content: {
										name: 'AMB1',
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
						LLayer: 2,
						content: {}
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
				value: now // 1000
			},
			duration: 60, // 60s 1060
			LLayer: 1,
			classes: ['obj0Class'],
			content: {}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end' // 1060
			},
			duration: '#obj0.duration / 2', // 30s 1090
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end' // 1090
			},
			duration: '#obj1.end - #obj0.start', // 90s // 1180
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj3', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj2.end'
			},
			// duration: '5400 - #.start', // Self reference has been (temporarily?) deprecated
			// @ts-ignore
			legacyEndTime: '5400', // so it ends at 5400
			LLayer: 1,
			content: {}
		}
	],
	'relativedurationorder0': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#group1.start - #.start', // stop with start of child1
			// @ts-ignore
			legacyEndTime: '#child1.start',
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
						LLayer: 2,
						content: {}
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
						LLayer: 4,
						content: {}
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
			classes: ['obj0Class'],
			content: {}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: '0',
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end'
			},
			duration: 10,
			LLayer: 1,
			content: {}
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
			classes: ['obj0Class'],
			content: {}
		},
		{
			id: 'obj1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.end'
			},
			duration: '#obj0.duration / 2', // 30s
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj2', // the id must be unique

			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj1.end'
			},
			duration: 10,
			LLayer: 1,
			content: {}
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
						LLayer: 1,
						content: {}
					},
					{
						id: 'child1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#child0.end'
						},
						duration: 20,
						LLayer: 1,
						content: {}
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
						LLayer: 1,
						content: {}
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
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#obj0.start + 5'
			},
			duration: '#obj0.end - #.start', // make it end at the same time as obj0
			LLayer: 1,
			content: {}
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
						LLayer: 3,
						content: {}
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
						LLayer: 3,
						content: {}
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
			// duration: '#group3.start + 100 - #.start',
			// @ts-ignore
			legacyEndTime: '#group3.start + 100',
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
									LLayer: 4,
									content: {}
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
									LLayer: 6,
									content: {}
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
									LLayer: 8,
									content: {}
								}
							]
						}
					}
				]
			}
		}
	],
	'childEndRelativeParentEnd': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#group3.start + 600 - #.start',
			// @ts-ignore
			legacyEndTime: '#group3.start + 600',
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
						// duration: '(#group0.end - #.start) - 2000',
						// @ts-ignore
						legacyEndTime: '#group0.end - 2000',
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
									LLayer: 4,
									content: {}
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
				value: now + 5000
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
						duration: 3600,
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
									LLayer: 8,
									content: {}
								}
							]
						}
					}
				]
			}
		}
	],
	'relativeDurationZeroLength': [
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
						id: 'group0_1', // the id must be unique
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						duration: 0,
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
									LLayer: 3,
									content: {}
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
				value: now
			},
			duration: 0,
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'group1_1', // the id must be unique
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						// duration: '#group0_1.start - #.start',
						// @ts-ignore
						legacyEndTime: '#group0_1.start',
						LLayer: 2,
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
									LLayer: 3,
									content: {}
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
			LLayer: 0,
			content: {}
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '((#obj0.start - #.start) - (1000 + (2000 / 2)))',
			// @ts-ignore
			legacyEndTime: '((#obj0.start) - (1000 + (2000 / 2)))',
			LLayer: 1,
			content: {}
		}
	],
	'operatorOrder': [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 3000
			},
			duration: 0,
			LLayer: 0,
			content: {}
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '(#obj0.start - #.start) - 2000',
			// @ts-ignore
			legacyEndTime: '(#obj0.start - 0) - 2000',
			LLayer: 1,
			content: {}
		},
		{
			id: 'obj2',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#obj0.start - 2000 - #.start',
			// @ts-ignore
			legacyEndTime: '#obj0.start - 2000 - 0',
			LLayer: 2,
			content: {}
		},
		{
			id: 'obj3',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#obj0.start - #.start - 2000',
			// @ts-ignore
			legacyEndTime: '#obj0.start - 0 - 2000',
			LLayer: 3,
			content: {}
		},
		{
			id: 'obj4',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '(#obj0.start - #.start) + 2000',
			// @ts-ignore
			legacyEndTime: '(#obj0.start - 0) + 2000',
			LLayer: 4,
			content: {}
		},
		{
			id: 'obj5',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#obj0.start + 2000 - #.start',
			// @ts-ignore
			legacyEndTime: '#obj0.start + 2000 - 0',
			LLayer: 5,
			content: {}
		},
		{
			id: 'obj6',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			// duration: '#obj0.start - #.start + 2000',
			// @ts-ignore
			legacyEndTime: '#obj0.start - 0 + 2000',
			LLayer: 6,
			content: {}
		}
	],
	'childWithStartBeforeParent': [
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 5000
			},
			duration: 0,
			LLayer: 1,
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'child0',
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: -1000 // Relative to parent object
						},
						duration: 0,
						LLayer: 2,
						content: {}
					},
					{
						id: 'child1',
						trigger: {
							type: TriggerType.TIME_RELATIVE,
							value: '#group0.start - 1000'
						},
						duration: 0,
						LLayer: 3,
						content: {}
					}
				]
			}
		}
	],
	'logicalTriggers': [
		{
			id: 'obj0', // The default state of llayer0
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 0,
			LLayer: 'layer0',
			content: {}
		},
		{
			id: 'obj1', // The object we will trigger on
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 3000
			},
			duration: 0,
			LLayer: 'layer1', // This ensures it works with string layer names
			classes: ['class0'],
			content: {}
		},
		{
			id: 'obj2',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '#obj1' // Obj1 is playing
			},
			duration: 0,
			priority: 1, // Needs to be more important than obj0
			LLayer: 'layer0',
			content: {}
		},
		{
			id: 'obj3',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '$layer1' // Something exists on layer1
			},
			duration: 0,
			LLayer: 'layer3',
			content: {}
		},
		{
			id: 'obj4',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '$layer1.class0' // layer1 has object with class
			},
			duration: 0,
			LLayer: 'layer4',
			content: {}
		},
		{
			id: 'obj5',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '$layer1.class1' // layer 1 has object with class
			},
			duration: 0,
			LLayer: 'layer5',
			content: {}
		},
		{
			id: 'obj6',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '!$layer1.class0' // layer 1 does not have object with class
			},
			duration: 0,
			LLayer: 'layer6',
			content: {}
		},
		{
			id: 'obj7',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '!$layer1.class1' // layer 1 does not have object with class
			},
			duration: 0,
			LLayer: 'layer7',
			content: {}
		}
	],
	'logicalTriggers2': [
		{
			id: 'obj0', // The default state of llayer0
			trigger: {
				type: TriggerType.LOGICAL,
				value: '1'
			},
			duration: 0,
			LLayer: 'layer0',
			content: {}
		},
		{
			id: 'group0', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1000
			},
			duration: 0,
			LLayer: 'layer1',
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{ // We can't trigger on a group, but we can on objects inside
						id: 'group0_first', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 'layer1_first',
						content: {}
					},
					{
						id: 'obj1', // the id must be unique

						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0 // Relative to parent object
						},
						duration: 0,
						LLayer: 'layer0',
						content: {}
					}
				]
			}
		},
		{
			id: 'group1', // the id must be unique

			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1000
			},
			duration: 0,
			LLayer: 'layer2',
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'obj2',
						trigger: {
							type: TriggerType.LOGICAL,
							value: '$layer1_first' // Obj1 is playing
						},
						duration: 1000,
						priority: 10, // Needs to be more important than obj0
						LLayer: 'layer0',
						content: {}
					}
				]
			}
		}
	],
	'logical_object_order': [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now
			},
			duration: 10000,
			LLayer: 'layer0',
			classes: ['class0'],
			content: {}
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 5000
			},
			duration: 10000,
			LLayer: 'layer1',
			classes: ['class1'],
			content: {}
		},
		{
			id: 'obj2',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '#obj0'
			},
			LLayer: 'layer2',
			content: {}
		},
		{
			id: 'obj3',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '#obj1'
			},
			LLayer: 'layer2',
			content: {}
		},
		{
			id: 'obj4',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '.class0'
			},
			LLayer: 'layer3',
			content: {}
		},
		{
			id: 'obj5',
			trigger: {
				type: TriggerType.LOGICAL,
				value: '.class1'
			},
			LLayer: 'layer3',
			content: {}
		}
	],
	'logical_object_order_grouped': [
		{
			id: 'group0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1000
			},
			duration: 10000,
			LLayer: 'g0',
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'obj0',
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						duration: 0,
						LLayer: 'layer0',
						classes: ['class0'],
						content: {}
					},
					{
						id: 'obj2',
						trigger: {
							type: TriggerType.LOGICAL,
							value: '#obj0'
						},
						LLayer: 'layer2',
						content: {}
					},
					{
						id: 'obj4',
						trigger: {
							type: TriggerType.LOGICAL,
							value: '.class0'
						},
						LLayer: 'layer3',
						content: {}
					}
				]
			}
		},
		{
			id: 'group1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 5000
			},
			duration: 10000,
			LLayer: 'g1',
			isGroup: true,
			repeating: false,
			content: {
				objects: [
					{
						id: 'obj1',
						trigger: {
							type: TriggerType.TIME_ABSOLUTE,
							value: 0
						},
						duration: 0,
						LLayer: 'layer1',
						classes: ['class1'],
						content: {}
					},
					{
						id: 'obj3',
						trigger: {
							type: TriggerType.LOGICAL,
							value: '#obj1'
						},
						LLayer: 'layer2',
						content: {}
					},
					{
						id: 'obj5',
						trigger: {
							type: TriggerType.LOGICAL,
							value: '.class1'
						},
						LLayer: 'layer3',
						content: {}
					}
				]
			}
		}
	]
}
const testData: {
	[dataset: string]: Array<NewTimelineObject>
} = {}
// Convert test-data to new data structure:
function convertTimelineObject (obj: TimelineObject): NewTimelineObject {
	const newObj: NewTimelineObject = {
		id: obj.id,
		enable: {
		},
		layer: obj.LLayer,
		// children?: Array<TimelineObject>
		// keyframes?: Array<TimelineKeyframe>
		classes: obj.classes,
		disabled: obj.disabled,
		isGroup: obj.isGroup,
		priority: obj.priority,
		content: obj.content
	}

	if (obj.trigger.type === TriggerType.TIME_ABSOLUTE) {
		newObj.enable.start = obj.trigger.value
	} else if (obj.trigger.type === TriggerType.TIME_RELATIVE) {
		newObj.enable.start = obj.trigger.value
	} else if (obj.trigger.type === TriggerType.LOGICAL) {
		newObj.enable.while = obj.trigger.value
		// if (newObj.enable.while === '1') {
		// 	newObj.enable.while = 'true'
		// } else if (newObj.enable.while === '0') {
		// 	newObj.enable.while = 'false'
		// }
	}
	if (obj.duration) {
		newObj.enable.duration = obj.duration
	}
	// @ts-ignore
	if (obj.legacyRepeatingTime) {
		// @ts-ignore
		newObj.enable.repeating = obj.legacyRepeatingTime
	}
	// @ts-ignore
	if (obj.legacyEndTime) {
		// @ts-ignore
		newObj.enable.end = obj.legacyEndTime
	}
	if (obj.content.keyframes) {
		newObj.keyframes = []
		_.each(obj.content.keyframes, (kf: TimelineKeyframe) => {
			newObj.keyframes.push(convertTimelineKeyframe(kf))
		})
		delete obj.content.keyframes
	}
	if (obj.isGroup && obj.content.objects) {
		newObj.isGroup = true
		newObj.children = []
		_.each(obj.content.objects, (obj: TimelineObject) => {
			newObj.children.push(convertTimelineObject(obj))
		})
		delete obj.content.objects
	}
	return newObj
}
function convertTimelineKeyframe (obj: TimelineKeyframe): NewTimelineKeyframe {
	const newKf: NewTimelineKeyframe = {
		id: obj.id,
		enable: {
		},
		// children?: Array<TimelineObject>
		// keyframes?: Array<TimelineKeyframe>
		classes: obj.classes,
		// disabled: boolean
		content: obj.content
	}
	if (obj.trigger.type === TriggerType.TIME_ABSOLUTE) {
		newKf.enable.start = obj.trigger.value
	} else if (obj.trigger.type === TriggerType.TIME_RELATIVE) {
		newKf.enable.start = obj.trigger.value
	} else if (obj.trigger.type === TriggerType.LOGICAL) {
		newKf.enable.while = obj.trigger.value
	}
	if (obj.duration) {
		newKf.enable.duration = obj.duration
	}
	return newKf
}
_.each(testDataOld, (dataset, key) => {
	const newDataset: any = []
	_.each(dataset, (obj: TimelineObject) => {
		newDataset.push(convertTimelineObject(obj))
	})
	testData[key] = newDataset
})
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
const getTestData = (dataset: string): NewTimelineObject[] => {
	let data = clone(testData[dataset])
	if (reverseData) {
		data = reverseDataObjs(data)
	}
	return data
}
const stdOpts: ResolveOptions = {
	time: 1000
}

type Tests = {[key: string]: any}
let tests: Tests = {
	'Basic timeline': () => {
		expect(() => {
			// @ts-ignore bad input
			const tl = Resolver.resolveTimeline()
		}).toThrowError()
		const data = getTestData('basic')
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified

		expect(tl.statistics.resolvedObjectCount).toEqual(2)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const state0 = Resolver.getState(tl, now - 100)
		const nextEvents = state0.nextEvents
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

		expect(nextEvents).toHaveLength(4)
		expect(nextEvents[0]).toMatchObject({
			type: EventType.START, time: 990, objId: 'obj0' })

		expect(nextEvents[1]).toMatchObject({
			type: EventType.END, time: 1050, objId: 'obj0' })
		expect(nextEvents[2]).toMatchObject({
			type: EventType.START, time: 1050, objId: 'obj1' })

		const state = Resolver.getState(tl, now)
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

		expect(state.layers['1']).toBeTruthy() // TimelineObject
		expect(state.time).toBe(now)
		expect(state.layers['1'].id).toBe('obj0')

		const state2 = Resolver.getState(tl, now)

		expect(state2.layers['1'].id).toBe('obj0')
		expect(data).toEqual(getTestData('basic')) // Make sure the original data was unmodified

	},
	'Basic timeline 2': () => {

		const data = getTestData('basic2')

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const tmpState = Resolver.getState(tl, 900)
		const nextEvents = tmpState.nextEvents
		expect(nextEvents).toHaveLength(2)
		expect(nextEvents[0].type).toBe(EventType.START)
		expect(nextEvents[0].time).toBe(950)
		expect(nextEvents[1].type).toBe(EventType.END)
		expect(nextEvents[1].time).toBe(1050)

		const state = Resolver.getState(tl, 1000)

		expect(state.time).toBe(1000)
		expect(state.layers['10'].id).toBe('obj0')

		const state2 = Resolver.getState(tl, 1000)

		expect(state2.layers['10'].id).toBe('obj0')
		expect(data).toEqual(getTestData('basic2')) // Make sure the original data is unmodified
	},
	'Basic timeline 3': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(3)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const tmpState = Resolver.getState(tl, 1000, 1) // limit
		const nextEvents = tmpState.nextEvents
		expect(nextEvents).toHaveLength(1) // see that the limit is working
		expect(nextEvents[0].type).toBe(EventType.END)
		expect(nextEvents[0].time).toBe(1050)

		const state = Resolver.getState(tl, 1000)
		expect(state.layers['10'].id).toBe('obj1')
		expect(state.layers['11'].id).toBe('obj2')
		expect(data).toEqual(getTestData('basic2')
			.concat(getTestData('basic3'))) // Make sure the original data is unmodified
	},
	'Timeline, override object': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		const state = Resolver.getState(tl, 1000)
		expect(state.layers['10'].id).toBe('obj3')
	},
	'Timeline, override object 2': () => {
		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))
			.concat(getTestData('override2'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		const state = Resolver.getState(tl, 1000)
		expect(state.layers['10'].id).toBe('obj5')

		const stateInFuture = Resolver.getState(tl, 10000)
		expect(stateInFuture.layers['10'].id).toBe('obj5')
	},
	'Timeline, override object 3': () => {

		const data = getTestData('basic2')
			.concat(getTestData('basic3'))
			.concat(getTestData('override'))
			.concat(getTestData('override2'))
			.concat(getTestData('override3'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		const state = Resolver.getState(tl, 1000)
		expect(state.layers['10'].id).toBe('obj6')

		const stateInFuture = Resolver.getState(tl, 10000)
		expect(stateInFuture.layers['10'].id).toBe('obj5')
	},
	'Timeline, relative timing': () => {

		const data = getTestData('relative1')

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(6)
		expect(tl.statistics.unresolvedCount).toEqual(1)

		const obj1 = tl.objects['obj1']
		expect(obj1).toBeTruthy() // TimelineObject
		expect(obj1.resolved.instances[0].start).toBe(1054)
		expect(obj1.resolved.instances[0].end).toBe(1064)

		const obj2 = tl.objects['obj2']
		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.instances[0].start).toBe(1068)
		expect(obj2.resolved.instances[0].end).toBe(1118)

		const obj3 = tl.objects['obj3']
		expect(obj3).toBeTruthy() // TimelineObject
		expect(obj3.resolved.instances[0].start).toBe(1058)
		expect(obj3.resolved.instances[0].end).toBe(1068)

		const obj4 = tl.objects['obj4']
		expect(obj4).toBeTruthy() // TimelineObject
		expect(obj4.resolved.instances[0].start).toBe(1118)
		expect(obj4.resolved.instances[0].end).toBe(1128)

		const obj5 = tl.objects['obj5']
		expect(obj5).toBeTruthy() // TimelineObject
		expect(obj5.resolved.instances[0].start).toBe(1123)
		expect(obj5.resolved.instances[0].end).toBe(1133)

		const state0 = Resolver.getState(tl, 1067)

		expect(state0.layers['10'].id).toBe('obj3')

		const state1 = Resolver.getState(tl, 1068)

		expect(state1.layers['10'].id).toBe('obj2')

		const tmpState = Resolver.getState(tl, 900)
		const nextEvents = tmpState.nextEvents

		expect(nextEvents).toHaveLength(12)

		expect(nextEvents[0]).toMatchObject({
			type: EventType.START, time: 950, objId: 'obj0' })
		expect(nextEvents[1]).toMatchObject({
			type: EventType.END, time: 1050, objId: 'obj0' })
		expect(nextEvents[2]).toMatchObject({
			type: EventType.START, time: 1054, objId: 'obj1' })
		expect(nextEvents[3]).toMatchObject({
			type: EventType.START, time: 1058, objId: 'obj3' })
		expect(nextEvents[4]).toMatchObject({
			type: EventType.END, time: 1064, objId: 'obj1' })
		expect(nextEvents[5]).toMatchObject({
			type: EventType.END, time: 1068, objId: 'obj3' })
		expect(nextEvents[6]).toMatchObject({
			type: EventType.START, time: 1068, objId: 'obj2' })
		expect(nextEvents[7]).toMatchObject({
			type: EventType.END, time: 1118, objId: 'obj2' })
		expect(nextEvents[8]).toMatchObject({
			type: EventType.START, time: 1118, objId: 'obj4' })
		expect(nextEvents[9]).toMatchObject({
			type: EventType.START, time: 1123, objId: 'obj5' })
		expect(nextEvents[10]).toMatchObject({
			type: EventType.END, time: 1128, objId: 'obj4' })
		expect(nextEvents[11]).toMatchObject({
			type: EventType.END, time: 1133, objId: 'obj5' })

		expect(data).toEqual(getTestData('relative1')) // Make sure the original data is unmodified
	},
	'Timeline, relative timing 2': () => {

		const data = getTestData('relative2')

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(2)
		expect(tl.statistics.unresolvedCount).toEqual(1)

		const obj2 = tl.objects['obj2']
		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.instances[0].start).toBe(965)
		expect(obj2.resolved.instances[0].end).toBe(1015)

		const state0 = Resolver.getState(tl, 1000)

		expect(state0.layers['10'].id).toBe('obj2')

		const state1 = Resolver.getState(tl, 2000)

		expect(state1.layers['10'].id).toBe('obj0')
	},
	'Timeline, relative timing and keyframes': () => {
		const data = getTestData('keyframes1')

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(3)
		expect(tl.statistics.resolvedKeyframeCount).toEqual(3)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const obj2 = tl.objects['obj2']

		expect(obj2).toBeTruthy() // TimelineObject
		expect(obj2.resolved.instances[0].start).toBe(965)
		expect(obj2.resolved.instances[0].end).toBe(1015)

		const obj3 = tl.objects['obj3']

		expect(obj3).toBeTruthy() // TimelineObject
		expect(obj3.resolved.instances[0].start).toBe(985)

		const tmpState0 = Resolver.getState(tl, 100, 10)

		const nextEvents0 = tmpState0.nextEvents
		expect(nextEvents0).toHaveLength(10)
		const tmpState1 = Resolver.getState(tl, 2000)
		const nextEvents1 = tmpState1.nextEvents
		expect(nextEvents1).toHaveLength(0)

		const state0 = Resolver.getState(tl, 966)

		let sobj2 = state0.layers['10']

		expect(sobj2.id).toBe('obj2')
		expect(sobj2.content.mixer.opacity).toBe(0.1)
		expect(sobj2.content.mixer.brightness).toBe(0.1)
		expect(sobj2.content.mixer.myCustomAttribute).toBeFalsy()

		const state1 = Resolver.getState(tl, 967)

		sobj2 = state1.layers['10']

		expect(sobj2.content.mixer.opacity).toBe(0.2)
		expect(sobj2.content.mixer.brightness).toBe(0.1)
		expect(sobj2.content.mixer.myCustomAttribute).toBeFalsy()

		const state2 = Resolver.getState(tl, 984)

		sobj2 = state2.layers['10']

		expect(sobj2.content.mixer.opacity).toBe(0.3)
		expect(sobj2.content.mixer.myCustomAttribute).toBe(1)

		expect(data).toEqual(getTestData('keyframes1')) // Make sure the original data is unmodified
	},
	'Timeline, absolute keyframe': () => {

		const data = getTestData('abskeyframe')

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const obj0 = tl.objects['obj0']

		expect(obj0).toBeTruthy() // TimelineObject
		expect(obj0.resolved.instances[0].start).toBe(1000)
		expect(obj0.resolved.instances[0].end).toBe(1050)

		const state0 = Resolver.getState(tl, 1000)

		const sobj0 = state0.layers['1']

		expect(sobj0).toBeTruthy() // TimelineResolvedObject
		expect(sobj0.id).toBe('obj0')
		expect(sobj0.resolved).toBeTruthy() // TimelineResolvedObject

		expect(sobj0.content.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		})
		expect(sobj0.content.attributes.opacity).toBeFalsy()

		const state1 = Resolver.getState(tl, 1005)

		const sobj1 = state1.layers['1']
		expect(sobj1).toBeTruthy() // TimelineResolvedObject
		expect(sobj1.content.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		0.5,
			opacity: 	0.5
		})
		const state2 = Resolver.getState(tl, 1010)

		const sobj2 = state2.layers['1']
		expect(sobj2).toBeTruthy() // TimelineResolvedObject
		expect(sobj2.content.attributes).toMatchObject({
			positionX: 	0,
			positionY: 	0,
			scale: 		1
		})

		expect(sobj2.content.attributes).toBeTruthy()
		expect(sobj2.content.attributes.opacity).toBeFalsy()

		expect(data).toEqual(getTestData('abskeyframe')) // Make sure the original data is unmodified
	},
	'logical objects, references': () => {

		const data = getTestData('basic')
			.concat(getTestData('logical1'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		// let tl = Resolver.resolveTimeline(data, stdOpts)
		// console.log('tl.resolved',tl.resolved)
		// expect(tl.statistics.resolvedObjectCount).toEqual( 3)
		// expect(tl.statistics.unresolvedCount).toEqual( 0)
		// let logical0 = _.find(tl.resolved, {id: 'logical0'})
		// 	expect(logical0).toBeTruthy() // TimelineObject

		// let logical1 = _.find(tl.resolved, {id: 'logical1'})
		// 	expect(logical1).toBeTruthy() // TimelineObject

		const state0 = Resolver.getState(tl, now)

		expect(state0.layers['1']).toBeTruthy() // TimelineResolvedObject
		expect(state0.layers['1'].id).toBe('obj0')

		expect(state0.layers['2']).toBeTruthy() // TimelineResolvedObject
		expect(state0.layers['2'].id).toBe('logical0')

		expect(state0.layers['3']).toBeTruthy() // TimelineResolvedObject
		expect(state0.layers['3'].id).toBe('logical1')

		expect(state0.layers['4']).toBeTruthy() // TimelineResolvedObject
		expect(state0.layers['4'].id).toBe('logical2')

		const state1 = Resolver.getState(tl, now + 1000)

		expect(state1.layers['2']).toBeTruthy() // TimelineResolvedObject
		expect(state1.layers['3']).toBeFalsy() // TimelineResolvedObject
		expect(state1.layers['4']).toBeTruthy() // TimelineResolvedObject

		expect(data).toEqual(getTestData('basic')
			.concat(getTestData('logical1'))) // Make sure the original data is unmodified
	},
	'logical objects, references 2': () => {

		const data = getTestData('basic')
			.concat(getTestData('logical2'))

		const tl = Resolver.resolveTimeline(data, stdOpts)

		const state0 = Resolver.getState(tl, now)

		expect(state0.layers['1']).toBeTruthy()
		expect(state0.layers['2']).toBeTruthy()
		expect(state0.layers['3']).toBeFalsy()

		const state1 = Resolver.getState(tl, now + 1000)

		expect(state1.layers['1']).toBeFalsy() // TimelineResolvedObject
		expect(state1.layers['2']).toBeFalsy() // TimelineResolvedObject
		expect(state1.layers['3']).toBeTruthy() // TimelineResolvedObject

		expect(data).toEqual(getTestData('basic')
			.concat(getTestData('logical2'))) // Make sure the original data is unmodified
	},
	'logical objects, references 3': () => {

		const data = getTestData('basic')
			.concat(getTestData('logical3'))

		const tl = Resolver.resolveTimeline(data, stdOpts)

		const state0 = Resolver.getState(tl, now)

		expect(state0.layers['1']).toBeTruthy()
		expect(state0.layers['2']).toBeTruthy()
		expect(state0.layers['3']).toBeFalsy()

		const state1 = Resolver.getState(tl, now + 1000)

		expect(state1.layers['1']).toBeFalsy() // TimelineResolvedObject
		expect(state1.layers['2']).toBeFalsy() // TimelineResolvedObject
		expect(state1.layers['3']).toBeTruthy() // TimelineResolvedObject

	},
	// 'setTraceLevel': () => {
	// 	Resolver.setTraceLevel(TraceLevel.INFO)
	// 	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

	// 	Resolver.setTraceLevel(TraceLevel.ERRORS)
	// 	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)

	// 	Resolver.setTraceLevel('INFO')
	// 	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.INFO)

	// 	Resolver.setTraceLevel('asdf')
	// 	expect(Resolver.getTraceLevel()).toEqual(TraceLevel.ERRORS)
	// },
	// 'getObjectsInWindow': () => {
	// 	const data = clone(getTestData('basic'))

	// 	const tld = Resolver.getObjectsInWindow(clone(data), now - 10, now + 10)

	// 	expect(tl.statistics.resolvedCount).toEqual(1)
	// 	expect(tld.unresolved).toHaveLength(0)

	// 	expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified
	// },
	// 'External functions': () => {
	// 	const data = clone(getTestData('basic'))

	// 	const state0 = Resolver.getState(tl, now)
	// 	expect(data).toEqual(getTestData('basic')) // Make sure the original data is unmodified

	// 	expect(state0.layers['1']).toBeTruthy() // TimelineObject
	// 	expect(state0.layers['1'].id).toBe('obj0')

	// 	const obj0: TimelineObject = _.findWhere(data, { id: 'obj0' })
	// 	obj0.externalFunction = 'ext0'

	// 	const externalFunctions0: ExternalFunctions = {
	// 		'ext0': jest.fn((resolvedObj: TimelineResolvedObject, state: TimelineState, tld: DevelopedTimeline) => {
	// 			// disable this object
	// 			resolvedObj.resolved.disabled = true
	// 			state = state
	// 			tld = tld

	// 			return true
	// 		})
	// 	}

	// 	const state1 = Resolver.getState(tl, now, externalFunctions0)

	// 	expect(externalFunctions0.ext0).toHaveBeenCalledTimes(1)

	// 	expect(state1.layers['1']).toBeFalsy() // TimelineObject

	// },
	'Expressions': () => {

		// expect(Resolver.interpretExpression('1 + 2')).toMatchObject({
		// 	l: '1',
		// 	o: '+',
		// 	r: '2'
		// })

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('1 + 2')
		// )).toEqual(3)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('5 + 4 - 2 + 1 - 5 + 7')
		// )).toEqual(10)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('5 - 4 - 3')
		// )).toEqual(-2)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('5 - 4 - 3 - 10 + 2')
		// )).toEqual(-10)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('4 * 5.5')
		// )).toEqual(22)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('2 * 3 * 4')
		// )).toEqual(24)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('20 / 4 / 2')
		// )).toEqual(2.5)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('2 * (2 + 3) - 2 * 2')
		// )).toEqual(6)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('2 * 2 + 3 - 2 * 2')
		// )).toEqual(3)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('2 * 2 + 3 - 2 * 2')
		// )).toEqual(3)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('5 + -3')
		// )).toEqual(2)yarn

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('5 + - 3')
		// )).toEqual(2)

		// expect(Resolver.resolveExpression(
		// 	Resolver.interpretExpression('')
		// )).toEqual(NaN)

		// expect(() => {
		// 	Resolver.resolveLogicalExpression(
		// 		Resolver.interpretExpression('5 + ) 2') // unbalanced paranthesis
		// 	)
		// }).toThrowError()
		// expect(() => {
		// 	Resolver.resolveLogicalExpression(
		// 		Resolver.interpretExpression('5 ( + 2') // unbalanced paranthesis
		// 	)
		// }).toThrowError()
		// expect(() => {
		// 	Resolver.resolveLogicalExpression(
		// 		Resolver.interpretExpression('5 * ') // unbalanced expression
		// 	)
		// }).toThrowError()

		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('1 | 0', true)
		// )).toEqual(true)
		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('1 & 0', true)
		// )).toEqual(false)

		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('1 | 0 & 0', true)
		// )).toEqual(false)

		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('0 & 1 | 1', true)
		// )).toEqual(false)
		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('(0 & 1) | 1', true)
		// )).toEqual(true)

		// expect(() => {
		// 	Resolver.resolveLogicalExpression(
		// 		Resolver.interpretExpression('(0 & 1) | 1 a', true) // strange operator
		// 	)
		// }).toThrowError()

		// expect(Resolver.resolveLogicalExpression(
		// 	Resolver.interpretExpression('(0 & 1) | a', true) // strange operand
		// )).toEqual(false)

		// expect(() => {
		// 	Resolver.resolveLogicalExpression(
		// 		Resolver.interpretExpression('14 + #badReference.start', true)
		// 	)
		// }).toThrowError()

		// const data = clone(getTestData('logical1'))
		// const state: TimelineState = {
		// 	time: now,
		// 	GLayers: {},
		// 	LLayers: {}
		// }
		// const val = Resolver.decipherLogicalValue('1', data[0], state)
		// expect(val).toBeTruthy()

	},
	'disabled objects on timeline': () => {

		const data = clone(getTestData('basic'))
		const obj0: NewTimelineObject = _.findWhere(data, { id: 'obj0' })
		obj0.disabled = true

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(2)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const state0 = Resolver.getState(tl, now)

		expect(state0.layers['1']).toBeFalsy()
	},
	'object with infinite duration': () => {

		const data = clone(getTestData('infiniteduration'))

		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.statistics.resolvedObjectCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(1) // because obj0 has infinite duration

		const state0 = Resolver.getState(tl, now)

		expect(state0.layers['1']).toBeTruthy()
		expect(state0.layers['1'].id).toBe('obj0')
	},
	'bad objects on timeline': () => {

		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].id
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].enable
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].enable.start
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].layer
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			delete data[0].content
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('basic'))
			data[0].id = 'asdf'
			data[1].id = 'asdf' // should be unique
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()

		expect(() => {
			const data = clone(getTestData('simplegroup'))
			delete data[0].children
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
		expect(() => {
			const data = clone(getTestData('simplegroup'))
			delete data[0].isGroup
			const tl = Resolver.resolveTimeline(data, stdOpts)
			Resolver.getState(tl, now)
		}).toThrowError()
	},
	'simple group': () => {
		const data = clone(getTestData('simplegroup'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(data).toEqual(getTestData('simplegroup')) // Make sure the original data is unmodified

		// console.log(JSON.stringify(tl,'', 3))
		expect(tl.statistics.resolvedCount).toEqual(4)
		expect(tl.statistics.resolvedObjectCount).toEqual(4)
		expect(tl.statistics.resolvedGroupCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const child0: NewResolvedTimelineObject = tl.objects['child0']
		const child1: NewResolvedTimelineObject = tl.objects['child1']
		const obj1: NewResolvedTimelineObject = tl.objects['obj1']

		expect(child0.resolved.instances[0].start).toBe(990)
		expect(child0.resolved.instances[0].end).toBe(1005)
		expect(child1.resolved.instances[0].start).toBe(1005)
		expect(child1.resolved.instances[0].end).toBe(1015)
		expect(obj1.resolved.instances[0].start).toBe(1050)

		const tmpState0 = Resolver.getState(tl, 0)
		const events0 = tmpState0.nextEvents
		// console.log('tld', tld.resolved)
		// console.log('events0', events0)
		expect(events0).toMatchObject([
			{ objId: 'child0', time: 990, type: EventType.START },
			{ objId: 'group0', time: 990, type: EventType.START },
			{ objId: 'child0', time: 1005, type: EventType.END },
			{ objId: 'child1', time: 1005, type: EventType.START },
			{ objId: 'child1', time: 1015, type: EventType.END },
			{ objId: 'group0', time: 1050, type: EventType.END },
			{ objId: 'obj1', time: 1050, type: EventType.START },
			{ objId: 'obj1', time: 1110, type: EventType.END }
		])
		const state0 = Resolver.getState(tl, now)
		expect(state0.layers['2']).toBeTruthy()
		expect(state0.layers['2']).toBeTruthy()
		expect(state0.layers['2'].id).toBe('child0')

		const tmpState1 = Resolver.getState(tl, now + 10)
		const events1 = tmpState1.nextEvents
		expect(events1).toMatchObject([
			{ objId: 'child1', time: 1015, type: EventType.END },
			{ objId: 'group0', time: 1050, type: EventType.END },
			{ objId: 'obj1', time: 1050, type: EventType.START },
			{ objId: 'obj1', time: 1110, type: EventType.END }
		])

		const state1 = Resolver.getState(tl, now + 10)
		expect(state1.layers['2']).toBeTruthy()
		expect(state1.layers['2']).toBeTruthy()
		expect(state1.layers['2'].id).toBe('child1')

		const tmpState2 = Resolver.getState(tl, now + 25)
		const events2 = tmpState2.nextEvents
		expect(events2).toMatchObject([
			{ objId: 'group0', time: 1050, type: EventType.END },
			{ objId: 'obj1', time: 1050, type: EventType.START },
			{ objId: 'obj1', time: 1110, type: EventType.END }
		])

		const state2 = Resolver.getState(tl, now + 25)
		expect(state2.layers['2']).toBeFalsy()
		expect(state2.layers['2']).toBeFalsy()

		const state3 = Resolver.getState(tl, now + 60)
		expect(state3.layers['2']).toBeTruthy()
		expect(state3.layers['2']).toBeTruthy()
		expect(state3.layers['2'].id).toBe('obj1')

		expect(data).toEqual(getTestData('simplegroup')) // Make sure the original data was unmodified
	},
	'repeating group': () => {

		const data = clone(getTestData('repeatinggroup'))
		const tl = Resolver.resolveTimeline(data, _.extend(stdOpts, { limitCount: 99, limitTime: 1050 }))
		expect(tl.statistics.resolvedObjectCount).toEqual(4)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(tl.objects['group0']).toBeTruthy()
		expect(tl.objects['child0']).toBeTruthy()
		expect(tl.objects['child1']).toBeTruthy()
		expect(tl.objects['obj1']).toBeTruthy()
		// console.log(tl.objects['group0'].resolved.instances)
		expect(tl.objects['group0'].resolved.instances).toMatchObject([
			{ start: 990, end: 1015 },
			{ start: 1015, end: 1040 },
			{ start: 1040, end: 1065 }
		])
		expect(tl.objects['child0'].resolved.instances).toMatchObject([
			{ start: 990, end: 1005 },
			{ start: 1015, end: 1030 },
			{ start: 1040, end: 1055 }
		])
		expect(tl.objects['child1'].resolved.instances).toMatchObject([
			{ start: 1005, end: 1015 },
			{ start: 1030, end: 1040 },
			{ start: 1055, end: 1065 }
		])
		expect(tl.objects['obj1'].resolved.instances).toMatchObject([
			{ start: 1015, end: 1021 },
			{ start: 1040, end: 1046 },
			{ start: 1065, end: 1071 }
		])
		expect(tl.objects['child1']).toBeTruthy()
		expect(tl.objects['child1'].resolved.instances[0].start).toBe(1005)

		const tmpState0 = Resolver.getState(tl, now, 99)
		const events0 = tmpState0.nextEvents
		expect(events0).toMatchObject([
			// { time: 990, type: EventType.START, objId: 'child0' },
			// { time: 990, type: EventType.START, objId: 'group0' },

			{ time: 1005, type: EventType.END, objId: 'child0' },
			{ time: 1005, type: EventType.START, objId: 'child1' },
			{ time: 1015, type: EventType.END, objId: 'child1' },
			{ time: 1015, type: EventType.END, objId: 'group0' },
			{ time: 1015, type: EventType.START, objId: 'child0' },
			{ time: 1015, type: EventType.START, objId: 'group0' },
			{ time: 1015, type: EventType.START, objId: 'obj1' },
			{ time: 1021, type: EventType.END, objId: 'obj1' },
			{ time: 1030, type: EventType.END, objId: 'child0' },
			{ time: 1030, type: EventType.START, objId: 'child1' },
			{ time: 1040, type: EventType.END, objId: 'child1' },
			{ time: 1040, type: EventType.END, objId: 'group0' },
			{ time: 1040, type: EventType.START, objId: 'child0' },
			{ time: 1040, type: EventType.START, objId: 'group0' },
			{ time: 1040, type: EventType.START, objId: 'obj1' },
			{ time: 1046, type: EventType.END, objId: 'obj1' },
			{ time: 1055, type: EventType.END, objId: 'child0' },
			{ time: 1055, type: EventType.START, objId: 'child1' },
			{ time: 1065, type: EventType.END, objId: 'child1' },
			{ time: 1065, type: EventType.END, objId: 'group0' },
			{ time: 1065, type: EventType.START, objId: 'obj1' },
			{ time: 1071, type: EventType.END, objId: 'obj1' }
		])

		expect(Resolver.getState(tl, now).layers).toMatchObject({
			'1': {
				id: 'child0'
			}
		})

		expect(Resolver.getState(tl, now + 10).layers).toMatchObject({
			'1': {
				id: 'child1'
			}
		})
		// Next loop:

		expect(Resolver.getState(tl, now + 25).layers).toMatchObject({
			'1': {
				id: 'child0'
			}
		})
		expect(Resolver.getState(tl, now + 35).layers).toMatchObject({
			'1': {
				id: 'child1'
			}
		})
		expect(data).toEqual(getTestData('repeatinggroup')) // Make sure the original data is unmodified
	},
	'repeating group in repeating group': () => {

		const data = clone(getTestData('repeatinggroupinrepeatinggroup'))
		const tl = Resolver.resolveTimeline(data, _.extend(stdOpts, { limitCount: 99, limitTime: 1180 }))
		expect(tl.statistics.resolvedObjectCount).toEqual(6)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(tl.objects['group0']).toBeTruthy()
		expect(tl.objects['child0']).toBeTruthy()
		expect(tl.objects['group1']).toBeTruthy()
		expect(tl.objects['child1']).toBeTruthy()
		expect(tl.objects['child2']).toBeTruthy()
		expect(tl.objects['obj1']).toBeTruthy()
		// console.log(tl.objects['group0'].resolved.instances)
		expect(tl.objects['group0'].resolved.instances).toMatchObject([
			{ start: 1000, end: 1092 },
			{ start: 1092, end: 1184 }
		])
		expect(tl.objects['child0'].resolved.instances).toMatchObject([
			{ start: 1000, end: 1030 },
			{ start: 1092, end: 1122 }
		])
		expect(tl.objects['group1'].resolved.instances).toMatchObject([
			{ start: 1030, end: 1055 },
			{ start: 1055, end: 1080 },
			{ start: 1080, end: 1092 }, // capped in parent
			// received: 1105   1130
			// next loop:
			{ start: 1122, end: 1147 },
			{ start: 1147, end: 1172 }, // 1172
			{ start: 1172, end: 1184 } // capped in parent
		])

		expect(tl.objects['child1'].resolved.instances).toMatchObject([
			{ start: 1030, end: 1040 },
			{ start: 1055, end: 1065 },
			{ start: 1080, end: 1090 },
			{ start: 1122, end: 1132 },
			{ start: 1147, end: 1157 },
			{ start: 1172, end: 1182 }
		])
		expect(tl.objects['child2'].resolved.instances).toMatchObject([
			{ start: 1040, end: 1055 }, // capped in group1
			{ start: 1065, end: 1080 }, // capped in group1
			{ start: 1090, end: 1092 }, // capped in group1
			{ start: 1132, end: 1147 }, // capped in group1
			{ start: 1157, end: 1172 }, // capped in group1
			{ start: 1182, end: 1184 } // capped in group1
		])
		/*
		const tmpState0 = Resolver.getState(tl, 990, 99)
		const events0 = tmpState0.nextEvents
		expect(events0).toMatchObject([
			{ time: 1000, type: EventType.START,  	 objId: 'child0' },
			{ time: 1000, type: EventType.START,  	 objId: 'group0' },
			{ time: 1030, type: EventType.END,  	 objId: 'child0' },
			{ time: 1030, type: EventType.START,  	 objId: 'child1' },
			{ time: 1030, type: EventType.START,  	 objId: 'group1' },
			{ time: 1040, type: EventType.END,  	 objId: 'child1' },
			{ time: 1040, type: EventType.START,  	 objId: 'child2' },
			{ time: 1055, type: EventType.END,  	 objId: 'child2' },
			{ time: 1055, type: EventType.END,  	 objId: 'group1' },
			{ time: 1055, type: EventType.START,  	 objId: 'child1' },
			{ time: 1055, type: EventType.START,  	 objId: 'group1' },
			{ time: 1065, type: EventType.END,  	 objId: 'child1' },
			{ time: 1065, type: EventType.START,  	 objId: 'child2' },
			{ time: 1080, type: EventType.END,  	 objId: 'child2' },
			{ time: 1080, type: EventType.END,  	 objId: 'group1' },
			{ time: 1080, type: EventType.START,  	 objId: 'child1' },
			{ time: 1080, type: EventType.START,  	 objId: 'group1' },
			{ time: 1090, type: EventType.END,  	 objId: 'child1' },
			{ time: 1090, type: EventType.START,  	 objId: 'child2' },
			{ time: 1092, type: EventType.END,  	 objId: 'child2' },
			{ time: 1092, type: EventType.END,  	 objId: 'group0' },
			{ time: 1092, type: EventType.END,  	 objId: 'group1' },
			{ time: 1092, type: EventType.START,  	 objId: 'child0' },
			{ time: 1092, type: EventType.START,  	 objId: 'group0' },
			{ time: 1122, type: EventType.END,  	 objId: 'child0' },
			{ time: 1122, type: EventType.START,  	 objId: 'child1' },
			{ time: 1122, type: EventType.START,  	 objId: 'group1' },
			{ time: 1132, type: EventType.END,  	 objId: 'child1' },
			{ time: 1132, type: EventType.START,  	 objId: 'child2' },
			{ time: 1147, type: EventType.END,  	 objId: 'child2' },
			{ time: 1147, type: EventType.END,  	 objId: 'group1' },
			{ time: 1147, type: EventType.START,  	 objId: 'child1' },
			{ time: 1147, type: EventType.START,  	 objId: 'group1' },
			{ time: 1157, type: EventType.END,  	 objId: 'child1' },
			{ time: 1157, type: EventType.START,  	 objId: 'child2' },
			{ time: 1172, type: EventType.END,  	 objId: 'child2' },
			{ time: 1172, type: EventType.END,  	 objId: 'group1' },
			{ time: 1172, type: EventType.START,  	 objId: 'child1' },
			{ time: 1172, type: EventType.START,  	 objId: 'group1' },
			{ time: 1182, type: EventType.END,  	 objId: 'child1' },
			{ time: 1182, type: EventType.START,  	 objId: 'child2' },
			{ time: 1184, type: EventType.END,  	 objId: 'child2' },
			{ time: 1184, type: EventType.END,  	 objId: 'group0' },
			{ time: 1184, type: EventType.END,  	 objId: 'group1' }
		])
		*/
	},
	'test group with duration and infinite child': () => {

		const data = clone(getTestData('groupwithduration'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(2)
		expect(tl.statistics.resolvedGroupCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 1030 }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 1030 }
			]
		})

		expect(Resolver.getState(tl, 1000).layers).toMatchObject({
			'1': {
				id: 'group0'
			},
			'2': {
				id: 'child0'
			}
		})

		expect(Resolver.getState(tl, 1000)).toMatchObject({
			layers: {
				'1': {
					id: 'group0'
				},
				'2': {
					id: 'child0'
				}
			},
			nextEvents: [
				// { type: EventType.START, time: 1000, objId: 'child0' },
				{ type: EventType.END, time: 1030, objId: 'child0' },
				{ type: EventType.END, time: 1030, objId: 'group0' }
			]
		})
		// a bit in:
		expect(Resolver.getState(tl, 1050).layers).toEqual({})

		// just before group1 is done playing:
		expect(Resolver.getState(tl, 1029)).toMatchObject({
			layers: {
				'1': {
					id: 'group0'
				},
				'2': {
					id: 'child0'
				}
			},
			nextEvents: [
				{ type: EventType.END, time: 1030, objId: 'child0' },
				{ type: EventType.END, time: 1030, objId: 'group0' }
			]
		})

		expect(data).toEqual(getTestData('groupwithduration')) // Make sure the original data is unmodified
	},
	'infinite group': () => {
		const data = clone(getTestData('infinitegroup'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(3)
		expect(tl.statistics.resolvedGroupCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(Resolver.getState(tl, 1000)).toMatchObject({
			layers: {
				'1': {
					id: 'group0'
				},
				'2': {
					id: 'child0'
				}
			},
			nextEvents: [
				{ type: EventType.END, time: 1005, objId: 'child0' },
				{ type: EventType.START, time: 1005, objId: 'child1' },
				{ type: EventType.END, time: 1015, objId: 'child1' }
			]
		})

		expect(Resolver.getState(tl, 1010)).toMatchObject({
			layers: {
				'1': {
					id: 'group0'
				},
				'2': {
					id: 'child1'
				}
			}
		})
		expect(data).toEqual(getTestData('infinitegroup')) // Make sure the original data is unmodified
	},
	'logical objects in group': () => {
		const data = clone(getTestData('logicalInGroup'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(3)
		expect(tl.statistics.resolvedGroupCount).toEqual(1)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(Resolver.getState(tl, 800)).toMatchObject({
			layers: {
				'3': {
					id: 'outside0'
				}
			},
			nextEvents: [
				{ type: EventType.START, time: 990, objId: 'child0' },
				{ type: EventType.START, time: 990, objId: 'group0' }
			]
		})

		expect(Resolver.getState(tl, 1000)).toMatchObject({
			layers: {
				'1': {
					id: 'group0'
				},
				'2': {
					id: 'child0'
				},
				'3': {
					id: 'outside0'
				}
			},
			nextEvents: []
		})

		expect(data).toEqual(getTestData('logicalInGroup')) // Make sure the original data is unmodified
	},
	'logical objects in group with logical expr': () => {
		const data = clone(getTestData('logicalInGroupLogical'))

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(data).toEqual(getTestData('logicalInGroupLogical')) // Make sure the original data is unmodified

		const state0 = Resolver.getState(tl, 1000)
		expect(state0.layers).toMatchObject({
			'1': {
				id: 'group0'
			},
			'2': {
				id: 'child0'
			}
		})
		expect(state0.layers['3']).toBeFalsy()
		expect(state0.layers['4']).toBeFalsy()

		expect(data).toEqual(getTestData('logicalInGroupLogical')) // Make sure the original data is unmodified
	},
	'keyframe in a grouped object': () => {
		const data = clone(getTestData('keyframeingroup'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(2)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(Resolver.getState(tl, 1000)).toMatchObject({
			layers: {
				'1': {
					id: 'obj1'
				},
				'2': {
					id: 'obj2',
					content: {
						type: 'file',
						name: 'AMB'
					}
				}
			},
			nextEvents: [
				{ type: EventType.KEYFRAME, time: 1010, objId: 'kf1' },
				{ type: EventType.KEYFRAME, time: 1020, objId: 'kf1' },
				{ type: EventType.END, time: 1060, objId: 'obj1' },
				{ type: EventType.END, time: 1060, objId: 'obj2' }
			]
		})

		expect(Resolver.getState(tl, 1015)).toMatchObject({
			layers: {
				'1': {
					id: 'obj1'
				},
				'2': {
					id: 'obj2',
					content: {
						type: 'file',
						name: 'AMB1',
						mixer: {
							opacity: 0
						}
					}
				}
			}
		})
		expect(Resolver.getState(tl, 1025)).toMatchObject({
			layers: {
				'1': {
					id: 'obj1'
				},
				'2': {
					id: 'obj2',
					content: {
						type: 'file',
						name: 'AMB'
					}
				}
			}
		})
	},
	'relative durations': () => {
		const data = clone(getTestData('relativeduration0'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(4)

		expect(Resolver.getState(tl, 990)).toMatchObject({
			nextEvents: [
				{ type: EventType.START, time: 1000, objId: 'obj0' },
				{ type: EventType.END, time: 1060, objId: 'obj0' },
				{ type: EventType.START, time: 1060, objId: 'obj1' },
				{ type: EventType.END, time: 1090, objId: 'obj1' },
				{ type: EventType.START, time: 1090, objId: 'obj2' },
				{ type: EventType.END, time: 1180, objId: 'obj2' },
				{ type: EventType.START, time: 1180, objId: 'obj3' },
				{ type: EventType.END, time: 5400, objId: 'obj3' }
			]
		})

		expect(Resolver.getState(tl, 1030)).toMatchObject({
			layers: {
				'1': { id: 'obj0' }
			}
		})
		expect(Resolver.getState(tl, 1070)).toMatchObject({
			layers: {
				'1': { id: 'obj1' }
			}
		})
		expect(Resolver.getState(tl, 1100)).toMatchObject({
			layers: {
				'1': { id: 'obj2' }
			}
		})
		expect(Resolver.getState(tl, 1190)).toMatchObject({
			layers: {
				'1': { id: 'obj3' }
			}
		})
		expect(Resolver.getState(tl, 5401).layers).toEqual({})
	},
	'Circular dependency 1': () => {
		// console.log('======')
		const data = clone(getTestData('circulardependency0'))

		// const tl = Resolver.resolveTimeline(data, stdOpts)
		// expect(tl.statistics.resolvedObjectCount).toEqual(0)

		expect(() => {
			Resolver.resolveTimeline(data, stdOpts)
		}).toThrowError(/circular/i)
	},
	'Circular dependency 2': () => {
		const data = clone(getTestData('circulardependency1'))
		expect(() => {
			Resolver.resolveTimeline(data, stdOpts)
		}).toThrowError(/circular/i)

		// const tl = Resolver.resolveTimeline(data, stdOpts)
		// expect(tl.statistics.resolvedObjectCount).toEqual(0)

		const obj0: NewTimelineObject = _.findWhere(data, { id: 'obj0' })
		obj0.enable.duration = 10 // break the circular dependency

		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedCount).toEqual(3)
	},
	'relative durations object order': () => {
		const data = clone(getTestData('relativedurationorder0'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(4)
		expect(tl.statistics.resolvedGroupCount).toEqual(2)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 1150 }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 1150 }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 1150, end: null }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1150, end: null }
			]
		})

		expect(Resolver.getState(tl, 1030)).toMatchObject({
			layers: {
				'1': { id: 'group0' },
				'2': { id: 'child0' }
			}
		})
		expect(Resolver.getState(tl, 1150)).toMatchObject({
			layers: {
				'3': { id: 'group1' },
				'4': { id: 'child1' }
			}
		})
	},
	'Cross-dependencies between group children': () => {
		const data = clone(getTestData('dependenciesBetweengroupchildren'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(5)
		expect(tl.statistics.resolvedGroupCount).toEqual(2)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: null }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 1010 }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1010, end: 1030 }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 1030, end: null }
			]
		})
		expect(tl.objects['child2'].resolved).toMatchObject({
			instances: [
				{ start: 1030, end: 1060 }
			]
		})
	},
	// 'self-reference expression': () => {
	// 	const data = clone(getTestData('selfreferenceexpression0'))
	// 	const tl = Resolver.resolveTimeline(data, stdOpts)
	// 	expect(tl.statistics.resolvedObjectCount).toEqual(2)

	// 	const obj0 = tl.objects['obj0']
	// 	const obj1 = tl.objects['obj1']

	// 	expect(obj0.resolved.instances[0].start).toEqual(1000)
	// 	expect(obj0.resolved.instances[0].end).toEqual(1010)

	// 	expect(obj1.resolved.instances[0].start).toEqual(1005)
	// 	expect(obj1.resolved.instances[0].end).toEqual(1010)
	// },
	'large dataset': () => {
		// worst-case dataset: relative objects, in random order
		const size = 500 // 500 seems okay, 1000 gives stack overflow
		let data: NewTimelineObject[] = []
		for (let i = 0; i < size; i++) {
			data.push({
				id: 'obj' + i,
				enable: {
					start: (
						i === 0 ?
						now :
						'#obj' + (i - 1) + '.end'
					),
					duration: 10
				},
				layer: 1,
				content: {}
			})
		}
		data = _.sortBy(data, Math.random)

		// const startTime = Date.now()
		const tl = Resolver.resolveTimeline(data, stdOpts)
		// const endTime = Date.now()
		expect(tl.statistics.resolvedObjectCount).toEqual(size)
		// expect(endTime - startTime).toBeLessThan(size )
	},
	'Relative start order': () => {
		const data = clone(getTestData('relativeStartOrder0'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.resolvedObjectCount).toEqual(4)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		expect(tl.objects['trans0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 3500 }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 3500 }
			]
		})
		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: null }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 2500, end: null }
			]
		})

		expect(Resolver.getState(tl, 1500)).toMatchObject({
			layers: {
				'3': { id: 'child1' }
			}
		})
		expect(Resolver.getState(tl, 3500)).toMatchObject({
			layers: {
				'3': { id: 'child0' }
			}
		})
		expect(Resolver.getState(tl, 4500)).toMatchObject({
			layers: {
				'3': { id: 'child0' }
			}
		})
	},
	'Relative with something past the end': () => {
		const data = clone(getTestData('relativePastEnd'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 4100 }
			]
		})
		expect(tl.objects['group2'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 4100 }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 4100 }
			]
		})
		expect(tl.objects['group4'].resolved).toMatchObject({
			instances: [
				// { start: 5000, end: 7500 } // capped by parent
			]
		})
		expect(tl.objects['child5'].resolved).toMatchObject({
			instances: [
				// { start: 5000, end: 7500 } // capped by parent
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})
		expect(tl.objects['group3'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})

		expect(tl.statistics.resolvedObjectCount).toEqual(6)
		expect(tl.statistics.resolvedGroupCount).toEqual(4)
		expect(tl.statistics.unresolvedCount).toEqual(2)

		const state0 = Resolver.getState(tl, 5500)
		expect(state0.layers['4']).toBeFalsy()
		expect(state0.layers['6']).toBeFalsy()
	},
	'Child relative duration before parent end': () => {
		const data = clone(getTestData('childEndRelativeParentEnd'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 6600 }
			]
		})
		expect(tl.objects['group2'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 4600 }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 4600 }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: null }
			]
		})
		expect(tl.objects['group3'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: 9600 }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 6000 , end: 9600 }
			]
		})

		expect(tl.statistics.resolvedObjectCount).toEqual(6)
		expect(tl.statistics.unresolvedCount).toEqual(0)

		const state0 = Resolver.getState(tl, 6500)
		expect(state0.layers['4']).toBeFalsy()
		expect(state0.layers['8']).toBeTruthy()
	},
	'Relative duration resolving to zero length': () => {
		const data = clone(getTestData('relativeDurationZeroLength'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 1000 , end: null }
			]
		})
		expect(tl.objects['group0_1'].resolved).toMatchObject({
			instances: [
				{ start: 1000 , end: null }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 1000 , end: null }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 1000 , end: null }
			]
		})
		expect(tl.objects['group1_1'].resolved).toMatchObject({
			instances: [
				// { start: 1000 , end: 1000 }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				// { start: 1000 , end: 1000 }
			]
		})

		expect(tl.statistics.unresolvedCount).toEqual(2)
		expect(tl.statistics.resolvedObjectCount).toEqual(4)

	},
	'Many parentheses': () => {
		const data = clone(getTestData('manyParentheses'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.unresolvedCount).toEqual(0)
		expect(tl.statistics.resolvedObjectCount).toEqual(2)

		expect(tl.objects['obj0'].resolved).toMatchObject({
			instances: [
				{ start: 4000 , end: null }
			]
		})
		expect(tl.objects['obj1'].resolved).toMatchObject({
			instances: [
				{ start: 1000 , end: 2000 }
			]
		})
	},
	'Operator order': () => {
		const data = clone(getTestData('operatorOrder'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.unresolvedCount).toEqual(0)
		expect(tl.statistics.resolvedObjectCount).toEqual(7)

		expect(tl.objects['obj0'].resolved).toMatchObject({
			instances: [
				{ start:  4000, end: null }
			]
		})
		expect(tl.objects['obj1'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 2000 }
			]
		})
		expect(tl.objects['obj2'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 2000 }
			]
		})
		expect(tl.objects['obj3'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 2000 }
			]
		})
		expect(tl.objects['obj4'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 6000 }
			]
		})
		expect(tl.objects['obj5'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 6000 }
			]
		})
		expect(tl.objects['obj6'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: 6000 }
			]
		})
	},
	'Child with a start before parent': () => {
		const data = clone(getTestData('childWithStartBeforeParent'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.unresolvedCount).toEqual(0)
		expect(tl.statistics.resolvedGroupCount).toEqual(1)
		expect(tl.statistics.resolvedObjectCount).toEqual(3)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: null }
			]
		})
		expect(tl.objects['child0'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: null }
			]
		})
		expect(tl.objects['child1'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: null }
			]
		})

		expect(Resolver.getState(tl, 1000)).toMatchObject({
			nextEvents: [
				{ type: EventType.START, time: 6000, objId: 'child0' },
				{ type: EventType.START, time: 6000, objId: 'child1' },
				{ type: EventType.START, time: 6000, objId: 'group0' }
			]
		})

		expect(Resolver.getState(tl, 5999).layers).toEqual({})
	},
	/*
	// Temporary (?) disable due to $layer.className currently isn't supported
	'Logical triggers': () => {
		const data = clone(getTestData('logicalTriggers'))
		const tl = Resolver.resolveTimeline(data, stdOpts)
		expect(tl.statistics.unresolvedCount).toEqual(6)
		expect(tl.statistics.resolvedObjectCount).toEqual(2)

		expect(tl.objects['obj0'].resolved).toMatchObject({
			instances: [
				{ start: 1000, end: null }
			]
		})
		expect(tl.objects['obj1'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})
		expect(tl.objects['obj2'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})
		expect(tl.objects['obj3'].resolved).toMatchObject({
			instances: [
				{ start: 4000, end: null }
			]
		})
		expect(tl.objects['obj4'].resolved).toMatchObject({
			instances: [
				{ start: , end: null }
			]
		})
		expect(tl.objects['obj5'].resolved).toMatchObject({
			instances: [
				{ start: , end: null }
			]
		})
		expect(tl.objects['obj6'].resolved).toMatchObject({
			instances: [
				{ start: , end: null }
			]
		})
		expect(tl.objects['obj7'].resolved).toMatchObject({
			instances: [
				{ start: , end: null }
			]
		})

		const obj0: TimelineResolvedObject = tl.objects['obj0']
		const obj1: TimelineResolvedObject = tl.objects['obj1']

		expect(obj0.resolved.instances[0].start).toBe(1000)
		expect(obj0.resolved.outerDuration).toBe(Infinity)

		expect(obj1.resolved.instances[0].start).toBe(4000)
		expect(obj1.resolved.outerDuration).toBe(Infinity)

		expect(_.findWhere(tl.unresolved, { id: 'obj2' })).toBeTruthy()
		expect(_.findWhere(tl.unresolved, { id: 'obj3' })).toBeTruthy()
		expect(_.findWhere(tl.unresolved, { id: 'obj4' })).toBeTruthy()
		expect(_.findWhere(tl.unresolved, { id: 'obj5' })).toBeTruthy()
		expect(_.findWhere(tl.unresolved, { id: 'obj6' })).toBeTruthy()
		expect(_.findWhere(tl.unresolved, { id: 'obj7' })).toBeTruthy()

		// Sample before logical trigger is true
		const state0 = Resolver.getState(tl, 1500)
		expect(state0.layers['layer0']).toBeTruthy()
		expect(state0.layers['layer0'].id).toEqual('obj0')
		expect(state0.layers['layer1']).toBeFalsy()
		expect(state0.layers['layer3']).toBeFalsy()
		expect(state0.layers['layer4']).toBeFalsy()
		expect(state0.layers['layer5']).toBeFalsy()
		expect(state0.layers['layer6']).toBeTruthy()
		expect(state0.layers['layer6'].id).toEqual('obj6')
		expect(state0.layers['layer7']).toBeTruthy()
		expect(state0.layers['layer7'].id).toEqual('obj7')

		// Sample after logical trigger is true
		const state1 = Resolver.getState(tl, 4500)
		expect(state1.layers['layer0']).toBeTruthy()
		expect(state1.layers['layer0'].id).toEqual('obj2')
		expect(state1.layers['layer1']).toBeTruthy()
		expect(state1.layers['layer1'].id).toEqual('obj1')
		expect(state1.layers['layer3']).toBeTruthy()
		expect(state1.layers['layer3'].id).toEqual('obj3')
		expect(state1.layers['layer4']).toBeTruthy()
		expect(state1.layers['layer4'].id).toEqual('obj4')
		expect(state1.layers['layer5']).toBeFalsy()
		expect(state1.layers['layer6']).toBeFalsy()
		expect(state1.layers['layer7']).toBeTruthy()
		expect(state1.layers['layer7'].id).toEqual('obj7')
	},
	*/
	'Logical triggers 2': () => {
		const data = clone(getTestData('logicalTriggers2'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.objects['obj0'].resolved).toMatchObject({
			instances: [
				{ start: 0, end: null }
			]
		})
		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: null }
			]
		})
		expect(tl.objects['group0_first'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: null }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: null }
			]
		})
		expect(tl.objects['obj2'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: null }
			]
		})

		// Sample before logical trigger is true
		const state0 = Resolver.getState(tl, 1500)
		expect(state0.layers['layer0']).toBeTruthy()
		expect(state0.layers['layer0'].id).toEqual('obj0')
		expect(state0.layers['layer1_first']).toBeFalsy()

		// Sample after logical trigger is true
		const state1 = Resolver.getState(tl, 2500)
		expect(state1.layers['layer0']).toBeTruthy()
		expect(state1.layers['layer0'].id).toEqual('obj2')
		expect(state1.layers['layer1_first']).toBeTruthy()
		expect(state1.layers['layer1_first'].id).toEqual('group0_first')
	},
	'Logical object order': () => {
		const data = clone(getTestData('logical_object_order'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		// Sample while first obj is active
		const state0 = Resolver.getState(tl, 2000)
		expect(state0.layers['layer0']).toBeTruthy()
		expect(state0.layers['layer0'].id).toEqual('obj0')
		expect(state0.layers['layer1']).toBeFalsy()
		expect(state0.layers['layer2']).toBeTruthy()
		expect(state0.layers['layer2'].id).toEqual('obj2')
		expect(state0.layers['layer3']).toBeTruthy()
		expect(state0.layers['layer3'].id).toEqual('obj4')

		// Sample while both objs are active
		const state1 = Resolver.getState(tl, 7000)
		expect(state1.layers['layer0']).toBeTruthy()
		expect(state1.layers['layer0'].id).toEqual('obj0')
		expect(state1.layers['layer1']).toBeTruthy()
		expect(state1.layers['layer1'].id).toEqual('obj1')
		expect(state1.layers['layer2']).toBeTruthy()
		expect(state1.layers['layer2'].id).toEqual('obj3')
		expect(state1.layers['layer3']).toBeTruthy()
		expect(state1.layers['layer3'].id).toEqual('obj5')

		// Sample while second obj is active
		const state2 = Resolver.getState(tl, 12000)
		expect(state2.layers['layer0']).toBeFalsy()
		expect(state2.layers['layer1']).toBeTruthy()
		expect(state2.layers['layer1'].id).toEqual('obj1')
		expect(state2.layers['layer2']).toBeTruthy()
		expect(state2.layers['layer2'].id).toEqual('obj3')
		expect(state2.layers['layer3']).toBeTruthy()
		expect(state2.layers['layer3'].id).toEqual('obj5')
	},
	'Logical object order grouped': () => {
		const data = clone(getTestData('logical_object_order_grouped'))
		const tl = Resolver.resolveTimeline(data, stdOpts)

		expect(tl.objects['group0'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: 12000 }
			]
		})
		expect(tl.objects['obj0'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: 12000 }
			]
		})
		expect(tl.objects['obj2'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: 12000 }
			]
		})
		expect(tl.objects['obj4'].resolved).toMatchObject({
			instances: [
				{ start: 2000, end: 12000 }
			]
		})
		expect(tl.objects['group1'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: 16000 }
			]
		})
		expect(tl.objects['obj1'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: 16000 }
			]
		})
		expect(tl.objects['obj3'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: 16000 }
			]
		})
		expect(tl.objects['obj5'].resolved).toMatchObject({
			instances: [
				{ start: 6000, end: 16000 }
			]
		})

		// Sample while first obj is active
		const state0 = Resolver.getState(tl, 2000)
		expect(state0.layers).toMatchObject({
			'layer0': { id: 'obj0' },
			'layer2': { id: 'obj2' },
			'layer3': { id: 'obj4' }
		})
		expect(state0.layers['layer1']).toBeFalsy()

		// Sample while both objs are active
		const state1 = Resolver.getState(tl, 7000)
		expect(state1.layers).toMatchObject({
			'layer0': { id: 'obj0' },
			'layer1': { id: 'obj1' },
			'layer2': { id: 'obj3' },
			'layer3': { id: 'obj5' }
		})

		// Sample while second obj is active
		const state2 = Resolver.getState(tl, 12000)
		expect(state2.layers).toMatchObject({
			// 'layer0': { id: 'obj0' },
			'layer1': { id: 'obj1' },
			'layer2': { id: 'obj3' },
			'layer3': { id: 'obj5' }
		})
		expect(state2.layers['layer0']).toBeFalsy()
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
	beforeEach(() => {
		resetId()
	})
	_.each(tests, (t, key) => {
		test(key, () => {
			reverseData = false
			t()
		})
	})
})
/*
describe('Tests with reversed data', () => {
	_.each(tests, (t, key) => {
		test(key, () => {
			reverseData = true
			t()
		})
	})
})
*/

// TODO: test .useExternalFunctions
