import { lookupExpression, Resolver } from '../resolver'
import { ResolvedTimeline, TimelineObject, TimelineObjectInstance, ResolvedTimelineObject } from '../../api/api'
import { interpretExpression } from '../expression'
import { EventType } from '../../api/enums'
import { resetId } from '../../lib'
import * as _ from 'underscore'

describe('resolver', () => {
	beforeEach(() => {
		resetId()
	})
	const rtl: ResolvedTimeline = {
		options: {
			time: 1000
		},
		objects: {},
		classes: {},
		layers: {},
		statistics: {
			unresolvedCount: 0,
			resolvedCount: 0,
			resolvedInstanceCount: 0,
			resolvedObjectCount: 0,
			resolvedGroupCount: 0,
			resolvedKeyframeCount: 0
		}
	}
	const stdObj: ResolvedTimelineObject = {
		id: 'obj0',
		layer: '10',
		enable: {},
		content: {},
		resolved: {
			resolved: false,
			resolving: false,
			instances: []
		}
	}
	test('expression: basic math', () => {
		expect(lookupExpression(rtl, stdObj, interpretExpression('1+2'), 'start'))		.toEqual({ value: 1 + 2, references: [] })
		expect(lookupExpression(rtl, stdObj, interpretExpression('123-23'), 'start'))	.toEqual({ value: 123 - 23, references: [] })
		expect(lookupExpression(rtl, stdObj, interpretExpression('4*5'), 'start'))		.toEqual({ value: 4 * 5, references: [] })
		expect(lookupExpression(rtl, stdObj, interpretExpression('20/4'), 'start'))		.toEqual({ value: 20 / 4, references: [] })
		expect(lookupExpression(rtl, stdObj, interpretExpression('24%5'), 'start'))		.toEqual({ value: 24 % 5, references: [] })
	})
	test('expressions', () => {
		expect(interpretExpression('1 + 2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2'
		})

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('1 + 2')
		,'start')).toEqual({ value: 3, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('5 + 4 - 2 + 1 - 5 + 7')
		,'start')).toEqual({ value: 10, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('5 - 4 - 3')
		,'start')).toEqual({ value: -2, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('5 - 4 - 3 - 10 + 2')
		,'start')).toEqual({ value: -10, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('4 * 5.5')
		,'start')).toEqual({ value: 22, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('2 * 3 * 4')
		,'start')).toEqual({ value: 24, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('20 / 4 / 2')
		,'start')).toEqual({ value: 2.5, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('2 * (2 + 3) - 2 * 2')
		,'start')).toEqual({ value: 6, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('2 * 2 + 3 - 2 * 2')
		,'start')).toEqual({ value: 3, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('2 * 2 + 3 - 2 * 2')
		,'start')).toEqual({ value: 3, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('5 + -3')
		,'start')).toEqual({ value: 2, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('5 + - 3')
		,'start')).toEqual({ value: 2, references: [] })

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('')
		,'start')).toEqual(null)

		expect(() => {
			lookupExpression(rtl, stdObj,
				interpretExpression('5 + ) 2'), 'start') // unbalanced paranthesis
		}).toThrowError()
		expect(() => {
			lookupExpression(rtl, stdObj,
				interpretExpression('5 ( + 2'), 'start') // unbalanced paranthesis
		}).toThrowError()
		expect(() => {
			lookupExpression(rtl, stdObj,
				interpretExpression('5 * '), 'start') // unbalanced expression
		}).toThrowError()

		const TRUE_EXPR = [{ start: 0, end: null, references: [] }]
		const FALSE_EXPR: any = []

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('1 | 0'), 'start'
		)).toMatchObject(TRUE_EXPR)
		expect(lookupExpression(rtl, stdObj,
			interpretExpression('1 & 0'), 'start'
		)).toMatchObject(FALSE_EXPR)

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('1 | 0 & 0'), 'start'
		)).toMatchObject(FALSE_EXPR)

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('0 & 1 | 1'), 'start'
		)).toMatchObject(FALSE_EXPR)
		expect(lookupExpression(rtl, stdObj,
			interpretExpression('(0 & 1) | 1'), 'start'
		)).toMatchObject(TRUE_EXPR)

		expect(() => {
			lookupExpression(rtl, stdObj,
				interpretExpression('(0 & 1) | 1 a'), 'start') // strange operator
		}).toThrowError()

		expect(lookupExpression(rtl, stdObj,
			interpretExpression('(0 & 1) | a'), 'start' // strange operand
		)).toEqual(null)

		expect(
			lookupExpression(rtl, stdObj,
				interpretExpression('14 + #badReference.start'), 'start'
			)
		).toEqual([])

		expect(
			lookupExpression(rtl, stdObj, interpretExpression('1'), 'start')
		).toBeTruthy()
	})
	test('lookupExpression', () => {
		const rtl: ResolvedTimeline = {
			options: {
				time: 1000
			},
			statistics: {
				unresolvedCount: 0,
				resolvedCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0
			},
			objects: {
				'first': {
					id: 'first',
					layer: '0',
					enable: {
						start: 0,
						end: 100
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false
					}
				},
				'second': {
					id: 'second',
					layer: '1',
					enable: {
						start: 20,
						end: 120
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false
					}
				},
				'third': {
					id: 'third',
					layer: '2',
					enable: {
						start: 40,
						end: 130
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false
					}
				},
				'fourth': {
					id: 'fourth',
					layer: '3',
					enable: {
						start: 40,
						end: null // never-ending
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false
					}
				},
				'middle': {
					id: 'middle',
					layer: '4',
					enable: {
						start: 25,
						end: 35
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false
					}
				}
			},
			classes: {},
			layers: {}
		}
		const obj: ResolvedTimelineObject = {
			id: 'obj0',
			layer: '10',
			enable: {},
			content: {},
			resolved: {
				resolved: false,
				resolving: false,
				instances: []
			}
		}

		expect(lookupExpression(rtl, obj, interpretExpression('#unknown'), 'start')).toEqual([])
		expect(lookupExpression(rtl, obj, interpretExpression('#first'), 'start')).toMatchObject([{
			start: 0,
			end: 100
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('#first.start'), 'start')).toMatchObject([{
			start: 0,
			end: 100
		}])

		expect(lookupExpression(rtl, obj, interpretExpression('#first & #second'), 'start')).toMatchObject([{
			start: 20,
			end: 100
		}])

		expect(lookupExpression(rtl, obj, interpretExpression('(#first & #second) | #third'), 'start')).toMatchObject([{
			start: 20,
			end: 130
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('#first & #second & !#middle'), 'start')).toMatchObject([
			{
				start: 20,
				end: 25
			},
			{
				start: 35,
				end: 100
			}
		])

		expect(lookupExpression(rtl, obj, interpretExpression('#first + 5'), 'start')).toMatchObject([{
			start: 5,
			end: 105
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('((#first & !#second) | #middle) + 1'), 'start')).toMatchObject([
			{
				start: 1,
				end: 21
			},
			{
				start: 26,
				end: 36
			}
		])
	})
	test('simple timeline', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 100
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 10', // 10
					duration: 10
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10', // 30
					duration: 15
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0 })
		)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.objects['video'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 0, end: 100 }]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 20 }]
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 30, end: 45 }]
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.time).toEqual(5)
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})
		expect(state0.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 15)).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				},
				'1': {
					id: 'graphic0'
				}
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 30,
					type: EventType.START,
					objId: 'graphic1'
				},
				{
					time: 45,
					type: EventType.END,
					objId: 'graphic1'
				},
				{
					time: 100,
					type: EventType.END,
					objId: 'video'
				}
			]
		})
		const state1 = Resolver.getState(resolved, 21)
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})
		expect(state1.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 31).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic1'
			}
		})
		const state2 = Resolver.getState(resolved, 46)
		expect(state2.layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})
		expect(state2.layers['1']).toBeFalsy()
	})
	// todo test: different triggers, start, end, duration, while
	// If object has a parent, only set if parent is on layer (if layer is set for parent)
	// repeatingobject with duration==repeating, and other object referring that .end
	test('repeating object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 40,
					repeating: 50
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 20', // 20
					duration: 19 // 39
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(
			Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 145 })
		)

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['video'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 40 },
				{ start: 50, end: 90 },
				{ start: 100, end: 140 }
			]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 20, end: 39 },
				{ start: 70, end: 89 },
				{ start: 120, end: 139 }
			]
		})
		const state0 = Resolver.getState(resolved, 15)
		expect(state0.layers['1']).toBeFalsy()
		expect(state0).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				}
			},
			nextEvents: [
				{
					time: 20,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 39,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 40,
					type: EventType.END,
					objId: 'video'
				},
				// next repeat:
				{
					time: 50,
					type: EventType.START,
					objId: 'video'
				},
				{
					time: 70,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 89,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 90,
					type: EventType.END,
					objId: 'video'
				},

				{
					time: 100,
					type: EventType.START,
					objId: 'video'
				},
				{
					time: 120,
					type: EventType.START,
					objId: 'graphic0'
				},
				{
					time: 139,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 140,
					type: EventType.END,
					objId: 'video'
				}
			]
		})

		expect(Resolver.getState(resolved, 21).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic0'
			}
		})
		const state1 = Resolver.getState(resolved, 39)
		expect(state1.layers['1']).toBeFalsy()
		expect(state1).toMatchObject({
			layers: {
				'0': {
					id: 'video'
				}
			}
		})

		expect(Resolver.getState(resolved, 51).layers).toMatchObject({
			'0': {
				id: 'video'
			}
		})

		expect(Resolver.getState(resolved, 72).layers).toMatchObject({
			'0': {
				id: 'video'
			},
			'1': {
				id: 'graphic0'
			}
		})
	})
	test('simple group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group',
				layer: '0',
				enable: {
					start: 10,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5', // 15
							duration: 10 // 25
						},
						content: {}
					},
					{
						id: 'child1',
						layer: '1',
						enable: {
							start: '#child0.end', // 25
							duration: 10 // 35
						},
						content: {}
					},
					{
						id: 'child2',
						layer: '2',
						enable: {
							start: '-1', // 9, will be capped in parent
							end: 150 // 160, will be capped in parent
						},
						content: {}
					}
				]
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
		// console.log(JSON.stringify(resolved, null, 3))
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.resolvedGroupCount).toEqual(1)

		expect(resolved.objects['group']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 25 }]
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 25, end: 35 }]
		})
		expect(resolved.objects['child2'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 100 }]
		})

		const state0 = Resolver.getState(resolved, 11)
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'group'
			}
		})
		expect(state0.layers['1']).toBeFalsy()

		expect(Resolver.getState(resolved, 15)).toMatchObject({
			layers: {
				'0': {
					id: 'group'
				},
				'1': {
					id: 'child0'
				},
				'2': {
					id: 'child2'
				}
			}
		})
		expect(Resolver.getState(resolved, 30)).toMatchObject({
			layers: {
				'0': {
					id: 'group'
				},
				'1': {
					id: 'child1'
				}
			}
		})
	})
	test('simple keyframes', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 100
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 10', // 10
					duration: 50
				},
				content: {
					attr0: 'base',
					attr1: 'base',
					attr2: 'base',
					attr3: 'base'
				},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							start: 3 // 13
						},
						content: {
							attr0: 'kf0',
							attr1: 'kf0'
						}
					},
					{
						id: 'kf1',
						enable: {
							start: '#kf0 + 7', // 20
							duration: '5' // 25
						},
						content: {
							attr0: 'kf1',
							attr2: 'kf1'
						}
					}
				]
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitTime: 50 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.resolvedKeyframeCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['kf0']).toBeTruthy()
		expect(resolved.objects['kf1']).toBeTruthy()

		expect(resolved.objects['kf0'].resolved.instances).toMatchObject([{
			start: 13,
			end: 60 // capped by parent
		}])
		expect(resolved.objects['kf1'].resolved.instances).toMatchObject([{
			start: 20,
			end: 25
		}])
		const state0 = Resolver.getState(resolved, 11)
		expect(state0).toMatchObject({
			layers: {
				'1': {
					id: 'graphic0',
					content: {
						attr0: 'base',
						attr1: 'base',
						attr2: 'base',
						attr3: 'base'
					}
				}
			},
			nextEvents: [
				{
					time: 13,
					type: EventType.KEYFRAME,
					objId: 'kf0'
				},
				{
					time: 20,
					type: EventType.KEYFRAME,
					objId: 'kf1'
				},
				{
					time: 25,
					type: EventType.KEYFRAME,
					objId: 'kf1'
				},
				{
					time: 60,
					type: EventType.END,
					objId: 'graphic0'
				},
				{
					time: 100,
					type: EventType.END,
					objId: 'video'
				}
			]
		})
		expect(Resolver.getState(resolved, 13).layers).toMatchObject({
			'1': {
				id: 'graphic0',
				content: {
					attr0: 'kf0',
					attr1: 'kf0',
					attr2: 'base',
					attr3: 'base'
				}
			}
		})
		expect(Resolver.getState(resolved, 21).layers).toMatchObject({
			'1': {
				id: 'graphic0',
				content: {
					attr0: 'kf1',
					attr1: 'kf0',
					attr2: 'kf1',
					attr3: 'base'
				}
			}
		})
		expect(Resolver.getState(resolved, 26).layers).toMatchObject({
			'1': {
				id: 'graphic0',
				content: {
					attr0: 'kf0',
					attr1: 'kf0',
					attr2: 'base',
					attr3: 'base'
				}
			}
		})
	})
	test('classes', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					end: 10,
					repeating: 50
				},
				content: {},
				classes: ['class0']
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: '#video0.end + 15', // 25
					duration: 10,
					repeating: 50
				},
				content: {},
				classes: ['class0', 'class1']
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					while: '.class0'
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '2',
				enable: {
					while: '.class1 + 1'
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0, limitTime: 100 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()

		expect(resolved.objects['video0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 10 },
				{ start: 50, end: 60 }
			]
		})
		expect(resolved.objects['video1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 25, end: 35 },
				{ start: 75, end: 85 }
			]
		})
		expect(resolved.objects['graphic0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 10 },
				{ start: 25, end: 35 },
				{ start: 50, end: 60 },
				{ start: 75, end: 85 }
			]
		})
		expect(resolved.objects['graphic1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 26, end: 36 },
				{ start: 76, end: 86 }
			]
		})

		const state0 = Resolver.getState(resolved, 5)
		expect(state0.layers['2']).toBeFalsy()
		expect(state0.layers).toMatchObject({
			'0': {
				id: 'video0'
			},
			'1': {
				id: 'graphic0'
			}
		})
		const state1 = Resolver.getState(resolved, 25)
		expect(state1.layers['2']).toBeFalsy()
		expect(state1.layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			}
		})
		expect(Resolver.getState(resolved, 26).layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			},
			'2': {
				id: 'graphic1'
			}
		})

		expect(Resolver.getState(resolved, 76).layers).toMatchObject({
			'0': {
				id: 'video1'
			},
			'1': {
				id: 'graphic0'
			},
			'2': {
				id: 'graphic1'
			}
		})
	})
	test('etheral groups', () => {
		// "etheral groups" are groups without a layer
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: '',
				enable: {
					start: 10,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5' // 15
						},
						content: {}
					}
				]
			},
			{
				id: 'group1',
				layer: '',
				enable: {
					start: 50,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '5' // 55
						},
						content: {}
					}
				]
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['group1']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 100 }]
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 100 }]
		})
		expect(resolved.objects['group1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 50, end: 100 }]
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 55, end: 100 }]
		})

		expect(Resolver.getState(resolved, 16).layers).toMatchObject({
			'1': {
				id: 'child0'
			}
		})
		expect(Resolver.getState(resolved, 56)).toMatchObject({
			layers: {
				'1': {
					id: 'child0'
				},
				'2': {
					id: 'child1'
				}
			},
			nextEvents: [
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END }
			]
		})

		// objects should be capped inside their parent:
		const state0 = Resolver.getState(resolved, 120)
		expect(state0.layers['1']).toBeFalsy()
		expect(state0.layers['2']).toBeFalsy()
	})
	test('solid groups', () => {
		// "solid groups" are groups with a layer
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 10,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '5' // 15
						},
						content: {}
					}
				]
			},
			{
				id: 'group1',
				layer: 'g0',
				enable: {
					start: 50,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '5' // 55
						},
						content: {}
					}
				]
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['group1']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 10, end: 50 }] // because group 1 started
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 15, end: 100 }]
		})
		expect(resolved.objects['group1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 50, end: 100 }]
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [{ start: 55, end: 100 }]
		})

		expect(Resolver.getState(resolved, 16)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				},
				'1': {
					id: 'child0'
				}
			},
			nextEvents: [
				{ objId: 'group0', time: 50, type: EventType.END },
				{ objId: 'group1', time: 50, type: EventType.START },
				{ objId: 'child1', time: 55, type: EventType.START },
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group1', time: 100, type: EventType.END }
			]
		})
		expect(Resolver.getState(resolved, 56)).toMatchObject({
			layers: {
				'g0': {
					id: 'group1'
				},
				'2': {
					id: 'child1'
				}
			},
			nextEvents: [
				{ objId: 'child0', time: 100, type: EventType.END },
				{ objId: 'child1', time: 100, type: EventType.END },
				{ objId: 'group1', time: 100, type: EventType.END }
			]
		})
		const state1 = Resolver.getState(resolved, 120)
		expect(state1.layers['g0']).toBeFalsy()
		expect(state1.layers['1']).toBeFalsy()
		expect(state1.layers['2']).toBeFalsy()
	})
	test('cap in repeating parent group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 0, // 0, 100
					duration: 80, // 80, 180
					repeating: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '50', // 50, 150
							duration: 20 // 70, 170
						},
						content: {}
					},
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '#child0.end', // 70, 170
							duration: 50 // 120 (to be capped at 100), 220 (to be capped at 200)
						},
						content: {}
					}
				]
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['group0']).toBeTruthy()
		expect(resolved.objects['child0']).toBeTruthy()
		expect(resolved.objects['child1']).toBeTruthy()

		expect(resolved.objects['group0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 0, end: 80 },
				{ start: 100, end: 180 }
			]
		})
		expect(resolved.objects['child0'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 50, end: 70 },
				{ start: 150, end: 170 }
			]
		})
		expect(resolved.objects['child1'].resolved).toMatchObject({
			resolved: true,
			instances: [
				{ start: 70, end: 80 },
				{ start: 170, end: 180 }
			]
		})
		expect(Resolver.getState(resolved, 10)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				}
			}
		})
		expect(Resolver.getState(resolved, 55)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				},
				'1': {
					id: 'child0'
				}
			}
		})
		expect(Resolver.getState(resolved, 78)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				},
				'2': {
					id: 'child1'
				}
			}
		})
		expect(Resolver.getState(resolved, 85).layers).toEqual({})

		expect(Resolver.getState(resolved, 110)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				}
			}
		})
		expect(Resolver.getState(resolved, 155)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				},
				'1': {
					id: 'child0'
				}
			}
		})
		expect(Resolver.getState(resolved, 178)).toMatchObject({
			layers: {
				'g0': {
					id: 'group0'
				},
				'2': {
					id: 'child1'
				}
			}
		})
		expect(Resolver.getState(resolved, 185).layers).toEqual({})
	})
	test('referencing child in parent group', () => {

		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: 'g0',
				enable: {
					start: 0,
					duration: 80
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							while: '#other'
						},
						content: {}
					}
				]
			},
			{
				id: 'other',
				layer: 'other',
				enable: {
					while: '1'
				},
				content: {}
			},
			{
				id: 'refChild0',
				layer: '42',
				enable: {
					while: '#child0'
				},
				content: {}
			}
		]

		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		// @ts-ignore object is possibly undefined
		timeline[0].children[0].enable.while = '1' // This shouldn't change the outcome, since it's changing from a reference that resolves to { while: '1' }

		const resolved1 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 })

		const states0 = Resolver.getState(resolved0, 90)
		const states1 = Resolver.getState(resolved1, 90)

		expect(states0.layers['other']).toBeTruthy()
		expect(states1.layers['other']).toBeTruthy()

		expect(states0.layers['42']).toBeFalsy()
		expect(states1.layers['42']).toBeFalsy()

		const omitReferences = (instances: TimelineObjectInstance[]) => {
			return _.map(instances, i => _.omit(i, ['references']))
		}
		expect(
			omitReferences(resolved0.objects['refChild0'].resolved.instances)
		).toEqual(
			omitReferences(resolved1.objects['refChild0'].resolved.instances)
		)
	})
	test('Unique instance ids', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 10,
					duration: 80
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					start: 10,
					duration: 20
				},
				content: {},
				priority: 1
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 199 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()

		const instanceIds: {[id: string]: true} = {}
		_.each(resolved.objects, (obj) => {
			_.each(obj.resolved.instances, instance => {
				expect(instanceIds[instance.id]).toBeFalsy()
				instanceIds[instance.id] = true
			})
		})

		expect(_.keys(instanceIds)).toHaveLength(3)
	})
	test('Repeating many', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8,
					repeating: 10
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(100)
	})
	test('Content start time in capped object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'extRef',
				layer: 'e0',
				enable: {
					start: 10,
					duration: 200
				},
				content: {}
			},
			{
				id: 'myGroup',
				layer: 'g0',
				enable: {
					start: 50,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [

					{
						id: 'video',
						layer: '1',
						enable: {
							start: '#extRef',
							duration: 200
						},
						content: {}
					},
					{
						id: 'interrupting',
						layer: '1',
						enable: {
							start: 10, // 60, will interrupt video in the middle of it
							duration: 10
						},
						content: {}
					},
					{
						id: 'video2',
						layer: '2',
						enable: {
							start: '-10', // 40
							duration: 200
						},
						content: {}
					},
					{
						id: 'interrupting2',
						layer: '2',
						enable: {
							while: '#interrupting'
						},
						content: {}
					}
				]
			}
		]
		const resolved0 = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 })
		const resolved = Resolver.resolveAllStates(resolved0)

		expect(resolved.statistics.resolvedObjectCount).toEqual(6)
		expect(resolved.statistics.resolvedGroupCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['myGroup']).toBeTruthy()
		expect(resolved.objects['myGroup'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['interrupting']).toBeTruthy()
		expect(resolved.objects['interrupting'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['interrupting'].resolved.instances[0]).toMatchObject({
			start: 60,
			end: 70
		})

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['video'].resolved.instances).toHaveLength(2)

		expect(resolved.objects['video'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 60,
			originalStart: 10,
			originalEnd: 210
		})
		expect(resolved.objects['video'].resolved.instances[1]).toMatchObject({
			start: 70,
			end: 100,
			originalStart: 10,
			originalEnd: 210
		})

		expect(resolved.objects['video2']).toBeTruthy()
		expect(resolved.objects['video2'].resolved.instances).toHaveLength(2)
		expect(resolved.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 50,
			end: 60,
			originalStart: 40,
			originalEnd: 240
		})
		expect(resolved.objects['video2'].resolved.instances[1]).toMatchObject({
			start: 70,
			end: 100,
			originalStart: 40,
			originalEnd: 240
		})
	})
	test('Keyframe falsey enable', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 1
				},
				content: {
					val: 1
				},
				keyframes: [
					{
						id: 'keyframe0',
						enable: { while: '!.class0' },
						content: {
							val2: 2
						}
					}
				]
			},
			{
				id: 'enabler0',
				layer: '1',
				enable: {
					start: 100
				},
				content: {},
				classes: ['class0']
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

		// Before class
		const state = Resolver.getState(resolved, 10, 10)
		expect(state.layers['0']).toBeTruthy()
		expect(state.layers['0'].content).toEqual({
			val: 1,
			val2: 2
		})

		// With class
		const state2 = Resolver.getState(resolved, 110, 10)
		expect(state2.layers['0']).toBeTruthy()
		expect(state2.layers['0'].content).toEqual({
			val: 1
		})
	})
	test('Keyframe falsey enable2', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					while: '1'
				},
				content: {
					val: 1
				},
				keyframes: [
					{
						id: 'keyframe0',
						enable: { while: '!.class0' },
						content: {
							val2: 2
						}
					}
				]
			},
			{
				id: 'enabler0',
				layer: '1',
				enable: {
					start: 100
				},
				content: {},
				classes: ['class0']
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

		// Before class
		const state = Resolver.getState(resolved, 10, 10)
		expect(state.layers['0']).toBeTruthy()
		expect(state.layers['0'].content).toEqual({
			val: 1,
			val2: 2
		})

		// With class
		const state2 = Resolver.getState(resolved, 110, 10)
		expect(state2.layers['0']).toBeTruthy()
		expect(state2.layers['0'].content).toEqual({
			val: 1
		})
	})
	test('Keyframe truthy enable', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					while: 1
				},
				content: {
					val: 1
				},
				keyframes: [
					{
						id: 'keyframe0',
						enable: { while: '.class0' },
						content: {
							val2: 2
						}
					}
				]
			},
			{
				id: 'enabler0',
				layer: '1',
				enable: {
					start: 100
				},
				content: {},
				classes: ['class0']
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

		// Before class
		const state = Resolver.getState(resolved, 10, 10)
		expect(state.layers['0']).toBeTruthy()
		expect(state.layers['0'].content).toEqual({
			val: 1
		})

		// With class
		const state2 = Resolver.getState(resolved, 110, 10)
		expect(state2.layers['0']).toBeTruthy()
		expect(state2.layers['0'].content).toEqual({
			val: 1,
			val2: 2
		})
	})
	test('Keyframe class from chained groups', () => {
		const timeline: TimelineObject[] = [
			{
			   'id': 'object0',
			   'enable': {
				  'while': 1
			   },
			   'priority': 0,
			   'layer': 'obj0',
			   'content': {
				  val: 1
			   },
			   'keyframes': [
				  {
					 'id': 'object0_kf0',
					 'enable': {
						'while': '.show_pip'
					 },
					 'content': {
						val2: 2
					 }
				  }
			   ]
			},
			{
			   'id': 'object1',
			   'enable': {
				  'while': '.show_pip'
			   },
			   'priority': 0,
			   'layer': 'obj1',
			   'content': {}
			},
			{
				'id': 'class0',
				'priority': 0,
				'enable': {
				   'start': 1000,
				   'duration': 800
				},
				'layer': 'cl0',
				'classes': [
				   'show_pip'
				],
				'content': {}
			},
			{
				'id': 'class1',
				'priority': 0,
				'enable': {
				   'start': 2000
				},
				'layer': 'cl0',
				'classes': [
				   'show_pip'
				],
				'content': {}
			}
		 ]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 800, limitCount: 10, limitTime: 3000 }))

		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['object0']).toBeTruthy()
		expect(resolved.objects['object0'].resolved.instances).toHaveLength(1)

		// Before class
		const state = Resolver.getState(resolved, 800, 10)
		expect(state.layers['obj0']).toBeTruthy()
		expect(state.layers['obj1']).toBeFalsy()
		expect(state.layers['obj0'].content).toEqual({
			val: 1
		})

		// With class
		const state2 = Resolver.getState(resolved, 1600, 10)
		expect(state2.layers['obj0']).toBeTruthy()
		expect(state2.layers['obj1']).toBeTruthy()
		expect(state2.layers['obj0'].content).toEqual({
			val: 1,
			val2: 2
		})

		// Before class from second
		const state3 = Resolver.getState(resolved, 1900, 10)
		expect(state3.layers['obj0']).toBeTruthy()
		expect(state3.layers['obj1']).toBeFalsy()
		expect(state3.layers['obj0'].content).toEqual({
			val: 1
		})

		// With class from second
		const state4 = Resolver.getState(resolved, 2100, 10)
		expect(state4.layers['obj0']).toBeTruthy()
		expect(state4.layers['obj1']).toBeTruthy()
		expect(state4.layers['obj0'].content).toEqual({
			val: 1,
			val2: 2
		})
	})
	test('Class not defined', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				priority: 0,
				enable: {
					while: '!.class0'
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(1)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy() // TODO - is this one correct?
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

		const state = Resolver.getState(resolved, 10, 10)
		expect(state.layers['0']).toBeTruthy()
		expect(state.layers['0'].id).toEqual('video0')
	})
	test('Reference duration', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				priority: 0,
				enable: {
					start: 10,
					end: 100
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '1',
				priority: 0,
				enable: {
					start: 20,
					duration: '#video0'
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['video1'].resolved.instances).toMatchObject([
			{
				start: 20,
				end: 110
			}
		])
	})
	test('Parent references', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'parent',
				layer: 'p0',
				priority: 0,
				enable: {
					start: '100'
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'video0',
						layer: '0',
						priority: 0,
						enable: {
							start: 20 + 30,
							duration: 10
						},
						content: {}
					},
					{
						id: 'video1',
						layer: '1',
						priority: 0,
						enable: {
							start: '20 + 30',
							duration: 10
						},
						content: {}
					}
				]
			},
			{
				id: 'video2',
				layer: '2',
				priority: 0,
				enable: {
					start: '150',
					duration: 10
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)

		// All 3 videos should start at the same time:
		expect(resolved.objects['video0']).toBeTruthy()
		expect(resolved.objects['video1']).toBeTruthy()
		expect(resolved.objects['video2']).toBeTruthy()
		expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['video1'].resolved.instances).toHaveLength(1)
		expect(resolved.objects['video2'].resolved.instances).toHaveLength(1)

		expect(resolved.objects['video0'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160
		})
		expect(resolved.objects['video1'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160
		})
		expect(resolved.objects['video2'].resolved.instances[0]).toMatchObject({
			start: 150,
			end: 160
		})
	})
	test('Reference own layer', () => {
		// https://github.com/SuperFlyTV/supertimeline/pull/50
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8
				},
				content: {}
			},
			{
				id: 'video1',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end',
					duration: 2
				},
				content: {}
			},
			{
				id: 'video2',
				layer: '0',
				enable: {
					// Play for 2 after each other object on layer 0
					start: '$0.end + 1',
					duration: 2
				},
				content: {}
			}
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([{
				start: 0,
				end: 8
			}])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([{
				start: 8,
				end: 9, // becuse it's overridden by video2
				originalEnd: 10
			}])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([{
				start: 9,
				end: 11
			}])
		}
	})
	test('Reference own class', () => {
		// https://github.com/SuperFlyTV/supertimeline/pull/50
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 0,
					duration: 8
				},
				content: {},
				classes: [ 'insert_after' ]
			},
			{
				id: 'video1',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end',
					duration: 2
				},
				content: {},
				classes: [ 'insert_after' ]
			},
			{
				id: 'video2',
				layer: '1',
				enable: {
					// Play for 2 after each other object with class 'insert_after'
					start: '.insert_after.end + 1',
					duration: 2
				},
				content: {},
				classes: [ 'insert_after' ]
			}
		]
		for (let i = 0; i < 2; i++) {
			timeline.reverse() // change the order
			expect(timeline.length).toEqual(3)

			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 100, limitTime: 99999 }))

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.statistics.unresolvedCount).toEqual(0)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toMatchObject([{
				start: 0,
				end: 8
			}])
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([{
				start: 8,
				end: 9, // becuse it's overridden by video2
				originalEnd: 10
			}])
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
			expect(resolved.objects['video2'].resolved.instances).toMatchObject([{
				start: 9,
				end: 11
			}])
		}
	})
	test('Continuous combined negated and normal classes on different objects', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'parent',
				layer: 'p0',
				priority: 0,
				enable: {
					while: 1
				},
				content: {
					val: 1
				},
				keyframes: [
					{
						id: 'kf0',
						enable: {
							while: '.playout & !.muted'
						},
						content: {
							val: 2
						}
					}
				]
			},

			{
				id: 'muted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '100',
					duration: 100
				},
				content: {},
				classes: [ 'playout', 'muted' ]
			},
			{
				id: 'muted_playout2',
				layer: '2',
				priority: 0,
				enable: {
					start: '200',
					duration: 100
				},
				content: {},
				classes: [ 'playout', 'muted' ]
			},
			{
				id: 'unmuted_playout1',
				layer: '2',
				priority: 0,
				enable: {
					start: '300',
					duration: 100
				},
				content: {},
				classes: [ 'playout' ]
			}
		]

		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999 }))

		expect(resolved.statistics.resolvedObjectCount).toEqual(4)

		// first everything is normal
		expect(Resolver.getState(resolved, 50).layers['p0'].content).toMatchObject({
			val: 1
		})

		// then we have muted playout
		expect(Resolver.getState(resolved, 150).layers['p0'].content).toMatchObject({
			val: 1
		})

		// then we have muted playout again
		expect(Resolver.getState(resolved, 250).layers['p0'].content).toMatchObject({
			val: 1
		})

		// only then we have unmuted playout
		expect(Resolver.getState(resolved, 350).layers['p0'].content).toMatchObject({
			val: 2
		})

	})
})
