import { lookupExpression, Resolver } from '../resolver'
import { ResolvedTimeline, TimelineObject } from '../../api/api'
import { interpretExpression } from '../expression'

describe('resolver', () => {
	test('expression: basic math', () => {
		const rtl: ResolvedTimeline = {
			options: {
				time: 1000
			},
			objects: {
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
						instances: []
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
						instances: []
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
						instances: []
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
						instances: []
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
						instances: []
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
	})
})
