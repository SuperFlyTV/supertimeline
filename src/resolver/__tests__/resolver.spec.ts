import { lookupExpression, Resolver } from '../resolver'
import { ResolvedTimeline, TimelineObject } from '../../api/api'
import { interpretExpression } from '../expression'
import { EventType } from '../../api/enums'

describe('resolver', () => {
	test('expression: basic math', () => {
		const rtl: ResolvedTimeline = {
			options: {
				time: 1000
			},
			objects: {
			},
			statistics: {
				unresolvedCount: 0,
				resolvedCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0
			}
		}
		const obj: TimelineObject = {
			id: 'obj0',
			layer: '10',
			trigger: {},
			content: {}
		}
		expect(lookupExpression(rtl, obj, interpretExpression('1+2'), 'start'))		.toEqual(1 + 2)
		expect(lookupExpression(rtl, obj, interpretExpression('123-23'), 'start'))	.toEqual(123 - 23)
		expect(lookupExpression(rtl, obj, interpretExpression('4*5'), 'start'))		.toEqual(4 * 5)
		expect(lookupExpression(rtl, obj, interpretExpression('20/4'), 'start'))	.toEqual(20 / 4)
		expect(lookupExpression(rtl, obj, interpretExpression('24%5'), 'start'))	.toEqual(24 % 5)
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
					trigger: {
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
					trigger: {
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
					trigger: {
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
					trigger: {
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
					trigger: {
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
			}
		}
		const obj: TimelineObject = {
			id: 'obj0',
			layer: '10',
			trigger: {},
			content: {}
		}

		expect(lookupExpression(rtl, obj, interpretExpression('#unknown'), 'start')).toEqual(null)
		expect(lookupExpression(rtl, obj, interpretExpression('#first'), 'start')).toEqual([{
			start: 0,
			end: 100
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('#first.start'), 'start')).toEqual([{
			start: 0,
			end: 100
		}])

		expect(lookupExpression(rtl, obj, interpretExpression('#first & #second'), 'start')).toEqual([{
			start: 20,
			end: 100
		}])

		expect(lookupExpression(rtl, obj, interpretExpression('(#first & #second) | #third'), 'start')).toEqual([{
			start: 20,
			end: 130
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('#first & #second & !#middle'), 'start')).toEqual([
			{
				start: 20,
				end: 25
			},
			{
				start: 35,
				end: 100
			}
		])

		expect(lookupExpression(rtl, obj, interpretExpression('#first + 5'), 'start')).toEqual([{
			start: 5,
			end: 105
		}])
		expect(lookupExpression(rtl, obj, interpretExpression('((#first & !#second) | #middle) + 1'), 'start')).toEqual([
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
				trigger: {
					start: 0,
					end: 100
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				trigger: {
					start: '#video.start + 10', // 10
					duration: 10
				},
				content: {}
			},
			{
				id: 'graphic1',
				layer: '1',
				trigger: {
					start: '#graphic0.end + 10', // 30
					duration: 15
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['graphic1']).toBeTruthy()
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
	// todo test: classes (multiple object with same class)
	// todo test: keyframes in repeating objects
	test('repeating object', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				trigger: {
					start: 0,
					end: 40,
					repeating: 50
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				trigger: {
					start: '#video.start + 20', // 20
					duration: 19 // 39
				},
				content: {}
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 145 })

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
				trigger: {
					start: 10,
					end: 100
				},
				content: {},
				isGroup: true,
				children: [
					{
						id: 'child0',
						layer: '1',
						trigger: {
							start: '5', // 15
							duration: 10
						},
						content: {}
					},
					{
						id: 'child1',
						layer: '1',
						trigger: {
							start: '#child0.end', // 25
							duration: 10
						},
						content: {}
					}
				]
			}
		]

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

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
				trigger: {
					start: 0,
					end: 100
				},
				content: {}
			},
			{
				id: 'graphic0',
				layer: '1',
				trigger: {
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
						trigger: {
							start: 3 // 13
						},
						content: {
							attr0: 'kf0',
							attr1: 'kf0'
						}
					},
					{
						id: 'kf1',
						trigger: {
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

		const resolved = Resolver.resolveTimeline(timeline, { time: 0 })

		expect(resolved.statistics.resolvedObjectCount).toEqual(2)
		expect(resolved.statistics.resolvedKeyframeCount).toEqual(2)
		expect(resolved.statistics.unresolvedCount).toEqual(0)

		expect(resolved.objects['video']).toBeTruthy()
		expect(resolved.objects['graphic0']).toBeTruthy()
		expect(resolved.objects['kf0']).toBeTruthy()
		expect(resolved.objects['kf1']).toBeTruthy()

		expect(resolved.objects['kf0'].resolved.instances).toMatchObject([{
			start: 13,
			end: null
		}])
		expect(resolved.objects['kf1'].resolved.instances).toMatchObject([{
			start: 20,
			end: 25
		}])

		expect(Resolver.getState(resolved, 11)).toMatchObject({
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
})
