import { ResolvedTimelineObject } from '../../api'
import { ExpressionHandler } from '../ExpressionHandler'
import { InstanceHandler } from '../InstanceHandler'
import { ReferenceHandler, ValueWithReference } from '../ReferenceHandler'
import { ResolvedTimelineHandler } from '../ResolvedTimelineHandler'
import { joinReferences } from '../lib/reference'

const plus = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
	if (a === null || b === null) return null
	return { value: a.value + b.value, references: joinReferences(a.references, b.references) }
}

test('operateOnArrays', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	const reference = new ReferenceHandler(resolvedTimeline, instance)
	expect(
		reference.operateOnArrays(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 30, end: 90, references: ['#b'] },
				{ id: '@c', start: 100, end: 110, references: ['#c'] },
			],
			{ value: 1, references: ['#x'] },
			plus
		)
	).toMatchObject([
		{ start: 11, end: 31, references: ['#a', '#x', '@@a'] },
		{ start: 31, end: 91, references: ['#a', '#b', '#x', '@@a', '@@b'] },
		{ start: 101, end: 111, references: ['#c', '#x', '@@c'] },
	])

	expect(
		reference.operateOnArrays(
			[
				{ id: '@a', start: 10, end: 30, references: ['#a'] },
				{ id: '@b', start: 50, end: 70, references: ['#b'] },
				{ id: '@c', start: 100, end: 110, references: ['#c'] },
			],
			[
				{ id: '@x', start: 0, end: 25, references: ['#x'] },
				{ id: '@y', start: 0, end: 30, references: ['#y'] },
				{ id: '@z', start: 1, end: 5, references: ['#z'] },
			],
			plus
		)
	).toMatchObject([
		{ start: 10, end: 50, references: ['#a', '#x', '@@a', '@@x'] },
		{ start: 50, end: 100, references: ['#a', '#b', '#x', '#y', '@@a', '@@b', '@@x', '@@y'] },
		{ start: 101, end: 115, references: ['#c', '#z', '@@c', '@@z'] },
	])

	expect(reference.operateOnArrays([{ id: '@a', start: 10, end: 30, references: ['#a'] }], null, plus)).toEqual(null)
})

describe('Resolver, expressions, empty timeline', () => {
	const stdObj: ResolvedTimelineObject = {
		id: 'obj0',
		layer: '10',
		enable: {},
		content: {},
		resolved: {
			firstResolved: false,
			resolvedReferences: false,
			resolvedConflicts: false,
			resolving: false,
			instances: [],
			directReferences: [],
			isKeyframe: false,
			isSelfReferencing: false,
			levelDeep: 0,
			parentId: undefined,
		},
	}
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	const reference = new ReferenceHandler(resolvedTimeline, instance)
	const expressionHandler = new ExpressionHandler()

	test('expression: basic math', () => {
		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1+2'), 'start')).toEqual({
			result: { value: 1 + 2, references: [] },
			allReferences: [],
		})
		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('123-23'), 'start')).toEqual({
			result: { value: 123 - 23, references: [] },
			allReferences: [],
		})
		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('4*5'), 'start')).toEqual({
			result: { value: 4 * 5, references: [] },
			allReferences: [],
		})
		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('20/4'), 'start')).toEqual({
			result: { value: 20 / 4, references: [] },
			allReferences: [],
		})
		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('24%5'), 'start')).toEqual({
			result: { value: 24 % 5, references: [] },
			allReferences: [],
		})
	})
	test('expressions', () => {
		expect(expressionHandler.interpretExpression('1 + 2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2',
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1 + 2'), 'start')).toEqual({
			result: { value: 3, references: [] },
			allReferences: [],
		})

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 + 4 - 2 + 1 - 5 + 7'), 'start')
		).toEqual({
			result: { value: 10, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 - 4 - 3'), 'start')).toEqual(
			{
				result: { value: -2, references: [] },
				allReferences: [],
			}
		)

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 - 4 - 3 - 10 + 2'), 'start')
		).toEqual({
			result: { value: -10, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('4 * 5.5'), 'start')).toEqual({
			result: { value: 22, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('2 * 3 * 4'), 'start')).toEqual(
			{
				result: { value: 24, references: [] },
				allReferences: [],
			}
		)

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('20 / 4 / 2'), 'start')
		).toEqual({
			result: { value: 2.5, references: [] },
			allReferences: [],
		})

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('2 * (2 + 3) - 2 * 2'), 'start')
		).toEqual({
			result: { value: 6, references: [] },
			allReferences: [],
		})

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('2 * 2 + 3 - 2 * 2'), 'start')
		).toEqual({
			result: { value: 3, references: [] },
			allReferences: [],
		})

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('2 * 2 + 3 - 2 * 2'), 'start')
		).toEqual({
			result: { value: 3, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 + -3'), 'start')).toEqual({
			result: { value: 2, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 + - 3'), 'start')).toEqual({
			result: { value: 2, references: [] },
			allReferences: [],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression(''), 'start')).toEqual({
			result: null,
			allReferences: [],
		})

		expect(() => {
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 + ) 2'), 'start') // unbalanced paranthesis
		}).toThrow()
		expect(() => {
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 ( + 2'), 'start') // unbalanced paranthesis
		}).toThrow()
		expect(() => {
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('5 * '), 'start') // unbalanced expression
		}).toThrow()

		const TRUE_EXPR = { result: [{ start: 0, end: null, references: [] }] }
		const FALSE_EXPR: any = { result: [] }

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1 | 0'), 'start')
		).toMatchObject(TRUE_EXPR)
		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1 & 0'), 'start')
		).toMatchObject(FALSE_EXPR)

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1 | 0 & 0'), 'start')
		).toMatchObject(FALSE_EXPR)

		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('0 & 1 | 1'), 'start')
		).toMatchObject(FALSE_EXPR)
		expect(
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('(0 & 1) | 1'), 'start')
		).toMatchObject(TRUE_EXPR)

		expect(() => {
			reference.lookupExpression(stdObj, expressionHandler.interpretExpression('(0 & 1) | 1 a'), 'start') // strange operator
		}).toThrow()

		expect(
			reference.lookupExpression(
				stdObj,
				expressionHandler.interpretExpression('(0 & 1) | a'),
				'start' // strange operand
			)
		).toEqual({ result: null, allReferences: [] })

		expect(
			reference.lookupExpression(
				stdObj,
				expressionHandler.interpretExpression('14 + #badReference.start'),
				'start'
			)
		).toEqual({
			result: [],
			allReferences: ['#badReference'],
		})

		expect(reference.lookupExpression(stdObj, expressionHandler.interpretExpression('1'), 'start')).toBeTruthy()

		// @ts-expect-error wrong expression type
		expect(reference.lookupExpression(stdObj, false, 'start')).toEqual({ result: null, allReferences: [] })
	})
})
describe('Resolver, expressions, filledtimeline', () => {
	const obj: ResolvedTimelineObject = {
		id: 'obj0',
		layer: '10',
		enable: {},
		content: {},
		resolved: {
			firstResolved: false,
			resolvedReferences: false,
			resolvedConflicts: false,
			resolving: false,
			instances: [],
			directReferences: [],
			isKeyframe: false,
			isSelfReferencing: false,
			levelDeep: 0,
			parentId: undefined,
		},
	}
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	const reference = new ReferenceHandler(resolvedTimeline, instance)
	const expressionHandler = new ExpressionHandler()

	resolvedTimeline.addTimelineObject({
		id: 'first',
		layer: '0',
		enable: {
			start: 0,
			end: 100,
		},
		content: {},
	})
	resolvedTimeline.addTimelineObject({
		id: 'second',
		layer: '1',
		enable: {
			start: 20,
			end: 120,
		},
		content: {},
	})
	resolvedTimeline.addTimelineObject({
		id: 'third',
		layer: '2',
		enable: {
			start: 40,
			end: 130,
		},
		content: {},
	})
	resolvedTimeline.addTimelineObject({
		id: 'fourth',
		layer: '3',
		enable: {
			start: 40,
			end: null, // never-ending
		},
		content: {},
	})
	resolvedTimeline.addTimelineObject({
		id: 'middle',
		layer: '4',
		enable: {
			start: 25,
			end: 35,
		},
		content: {},
	})

	test('lookupExpression', () => {
		expect(reference.lookupExpression(obj, expressionHandler.interpretExpression('#unknown'), 'start')).toEqual({
			result: [],
			allReferences: ['#unknown'],
		})
		expect(reference.lookupExpression(obj, expressionHandler.interpretExpression('#first'), 'start')).toMatchObject(
			{
				result: [
					{
						start: 0,
						end: 100,
					},
				],
			}
		)
		expect(
			reference.lookupExpression(obj, expressionHandler.interpretExpression('#first.start'), 'start')
		).toMatchObject({
			result: [
				{
					start: 0,
					end: 100,
				},
			],
		})

		expect(
			reference.lookupExpression(obj, expressionHandler.interpretExpression('#first & #second'), 'start')
		).toMatchObject({
			result: [
				{
					start: 20,
					end: 100,
				},
			],
		})

		expect(
			reference.lookupExpression(
				obj,
				expressionHandler.interpretExpression('(#first & #second) | #third'),
				'start'
			)
		).toMatchObject({
			result: [
				{
					start: 20,
					end: 130,
				},
			],
		})
		expect(
			reference.lookupExpression(
				obj,
				expressionHandler.interpretExpression('#first & #second & !#middle'),
				'start'
			)
		).toMatchObject({
			result: [
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

		expect(
			reference.lookupExpression(obj, expressionHandler.interpretExpression('#first + 5'), 'start')
		).toMatchObject({
			result: [
				{
					start: 5,
					end: 105,
				},
			],
		})
		expect(
			reference.lookupExpression(
				obj,
				expressionHandler.interpretExpression('((#first & !#second) | #middle) + 1'),
				'start'
			)
		).toMatchObject({
			result: [
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
