import { ResolvedTimeline, ResolvedTimelineObject } from '../../..'
import { lookupExpression } from '../../resolver'
import { interpretExpression } from '../../expression'

describe('Resolver, expressions', () => {
	beforeEach(() => {
		// resetId()
	})
	const rtl: ResolvedTimeline = {
		options: {
			time: 1000,
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
			resolvedKeyframeCount: 0,
			resolvingCount: 0,
		},
	}
	const stdObj: ResolvedTimelineObject = {
		id: 'obj0',
		layer: '10',
		enable: {},
		content: {},
		resolved: {
			resolved: false,
			resolving: false,
			instances: [],
			directReferences: [],
		},
	}

	test('expression: basic math', () => {
		expect(lookupExpression(rtl, stdObj, interpretExpression('1+2'), 'start')).toEqual({
			instances: { value: 1 + 2, references: [] },
			allReferences: [],
		})
		expect(lookupExpression(rtl, stdObj, interpretExpression('123-23'), 'start')).toEqual({
			instances: { value: 123 - 23, references: [] },
			allReferences: [],
		})
		expect(lookupExpression(rtl, stdObj, interpretExpression('4*5'), 'start')).toEqual({
			instances: { value: 4 * 5, references: [] },
			allReferences: [],
		})
		expect(lookupExpression(rtl, stdObj, interpretExpression('20/4'), 'start')).toEqual({
			instances: { value: 20 / 4, references: [] },
			allReferences: [],
		})
		expect(lookupExpression(rtl, stdObj, interpretExpression('24%5'), 'start')).toEqual({
			instances: { value: 24 % 5, references: [] },
			allReferences: [],
		})
	})
	test('expressions', () => {
		expect(interpretExpression('1 + 2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2',
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('1 + 2'), 'start')).toEqual({
			instances: { value: 3, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('5 + 4 - 2 + 1 - 5 + 7'), 'start')).toEqual({
			instances: { value: 10, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('5 - 4 - 3'), 'start')).toEqual({
			instances: { value: -2, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('5 - 4 - 3 - 10 + 2'), 'start')).toEqual({
			instances: { value: -10, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('4 * 5.5'), 'start')).toEqual({
			instances: { value: 22, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('2 * 3 * 4'), 'start')).toEqual({
			instances: { value: 24, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('20 / 4 / 2'), 'start')).toEqual({
			instances: { value: 2.5, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('2 * (2 + 3) - 2 * 2'), 'start')).toEqual({
			instances: { value: 6, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('2 * 2 + 3 - 2 * 2'), 'start')).toEqual({
			instances: { value: 3, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('2 * 2 + 3 - 2 * 2'), 'start')).toEqual({
			instances: { value: 3, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('5 + -3'), 'start')).toEqual({
			instances: { value: 2, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('5 + - 3'), 'start')).toEqual({
			instances: { value: 2, references: [] },
			allReferences: [],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression(''), 'start')).toEqual({
			instances: null,
			allReferences: [],
		})

		expect(() => {
			lookupExpression(rtl, stdObj, interpretExpression('5 + ) 2'), 'start') // unbalanced paranthesis
		}).toThrowError()
		expect(() => {
			lookupExpression(rtl, stdObj, interpretExpression('5 ( + 2'), 'start') // unbalanced paranthesis
		}).toThrowError()
		expect(() => {
			lookupExpression(rtl, stdObj, interpretExpression('5 * '), 'start') // unbalanced expression
		}).toThrowError()

		const TRUE_EXPR = { instances: [{ start: 0, end: null, references: [] }] }
		const FALSE_EXPR: any = { instances: [] }

		expect(lookupExpression(rtl, stdObj, interpretExpression('1 | 0'), 'start')).toMatchObject(TRUE_EXPR)
		expect(lookupExpression(rtl, stdObj, interpretExpression('1 & 0'), 'start')).toMatchObject(FALSE_EXPR)

		expect(lookupExpression(rtl, stdObj, interpretExpression('1 | 0 & 0'), 'start')).toMatchObject(FALSE_EXPR)

		expect(lookupExpression(rtl, stdObj, interpretExpression('0 & 1 | 1'), 'start')).toMatchObject(FALSE_EXPR)
		expect(lookupExpression(rtl, stdObj, interpretExpression('(0 & 1) | 1'), 'start')).toMatchObject(TRUE_EXPR)

		expect(() => {
			lookupExpression(rtl, stdObj, interpretExpression('(0 & 1) | 1 a'), 'start') // strange operator
		}).toThrowError()

		expect(
			lookupExpression(
				rtl,
				stdObj,
				interpretExpression('(0 & 1) | a'),
				'start' // strange operand
			)
		).toEqual({ instances: null, allReferences: [] })

		expect(lookupExpression(rtl, stdObj, interpretExpression('14 + #badReference.start'), 'start')).toEqual({
			instances: [],
			allReferences: ['#badReference'],
		})

		expect(lookupExpression(rtl, stdObj, interpretExpression('1'), 'start')).toBeTruthy()
	})
	test('lookupExpression', () => {
		const timeline: ResolvedTimeline = {
			options: {
				time: 1000,
			},
			statistics: {
				unresolvedCount: 0,
				resolvedCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0,
				resolvingCount: 0,
			},
			objects: {
				first: {
					id: 'first',
					layer: '0',
					enable: {
						start: 0,
						end: 100,
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false,
						directReferences: [],
					},
				},
				second: {
					id: 'second',
					layer: '1',
					enable: {
						start: 20,
						end: 120,
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false,
						directReferences: [],
					},
				},
				third: {
					id: 'third',
					layer: '2',
					enable: {
						start: 40,
						end: 130,
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false,
						directReferences: [],
					},
				},
				fourth: {
					id: 'fourth',
					layer: '3',
					enable: {
						start: 40,
						end: null, // never-ending
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false,
						directReferences: [],
					},
				},
				middle: {
					id: 'middle',
					layer: '4',
					enable: {
						start: 25,
						end: 35,
					},
					content: {},
					resolved: {
						resolved: false,
						instances: [],
						resolving: false,
						directReferences: [],
					},
				},
			},
			classes: {},
			layers: {},
		}
		const obj: ResolvedTimelineObject = {
			id: 'obj0',
			layer: '10',
			enable: {},
			content: {},
			resolved: {
				resolved: false,
				resolving: false,
				instances: [],
				directReferences: [],
			},
		}

		expect(lookupExpression(timeline, obj, interpretExpression('#unknown'), 'start')).toEqual({
			instances: [],
			allReferences: ['#unknown'],
		})
		expect(lookupExpression(timeline, obj, interpretExpression('#first'), 'start')).toMatchObject({
			instances: [
				{
					start: 0,
					end: 100,
				},
			],
		})
		expect(lookupExpression(timeline, obj, interpretExpression('#first.start'), 'start')).toMatchObject({
			instances: [
				{
					start: 0,
					end: 100,
				},
			],
		})

		expect(lookupExpression(timeline, obj, interpretExpression('#first & #second'), 'start')).toMatchObject({
			instances: [
				{
					start: 20,
					end: 100,
				},
			],
		})

		expect(
			lookupExpression(timeline, obj, interpretExpression('(#first & #second) | #third'), 'start')
		).toMatchObject({
			instances: [
				{
					start: 20,
					end: 130,
				},
			],
		})
		expect(
			lookupExpression(timeline, obj, interpretExpression('#first & #second & !#middle'), 'start')
		).toMatchObject({
			instances: [
				{
					start: 20,
					end: 25,
				},
				{
					start: 35,
					end: 100,
				},
			],
		})

		expect(lookupExpression(timeline, obj, interpretExpression('#first + 5'), 'start')).toMatchObject({
			instances: [
				{
					start: 5,
					end: 105,
				},
			],
		})
		expect(
			lookupExpression(timeline, obj, interpretExpression('((#first & !#second) | #middle) + 1'), 'start')
		).toMatchObject({
			instances: [
				{
					start: 1,
					end: 21,
				},
				{
					start: 26,
					end: 36,
				},
			],
		})
	})
})
