import { lookupExpression, Resolver } from '../resolver'
import { ResolvedTimeline, TimelineObject } from '../../api/api'
import { interpretExpression } from '../expression'
import { EventType } from '../../api/enums'
import { resetId } from '../../lib'

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
	const stdObj: TimelineObject = {
		id: 'obj0',
		layer: '10',
		enable: {},
		content: {}
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
		).toEqual(null)

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
		const obj: TimelineObject = {
			id: 'obj0',
			layer: '10',
			enable: {},
			content: {}
		}

		expect(lookupExpression(rtl, obj, interpretExpression('#unknown'), 'start')).toEqual(null)
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
					}
				]
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })
		// console.log(JSON.stringify(resolved, '', 3))
		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

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
					start: 0,
					duration: 80,
					repeating: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						enable: {
							start: '50', // 50
							duration: 20 // 70
						},
						content: {}
					},
					{
						id: 'child1',
						layer: '2',
						enable: {
							start: '#child0.end', // 70
							duration: 50 // 120, to be capped at 100
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
})
