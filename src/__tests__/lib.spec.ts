import {
	extendMandadory,
	isNumeric,
	sortEvents,
	cleanInstances,
	invertInstances,
	operateOnArrays,
	applyRepeatingInstances,
	capInstances,
	joinReferences,
	resetId,
	convertEventsToInstances
} from '../lib'
import { Reference } from '../api/api'

describe('lib', () => {
	beforeEach(() => {
		resetId()
	})
	const plus = (a: Reference | null, b: Reference | null): Reference | null => {
		if (a === null || b === null) return null
		return { value: a.value + b.value, references: joinReferences(a.references, b.references) }
	}

	test('extendMandadory', () => {
		expect(extendMandadory<any, any>(
			{ a: 1 },
			{ b: 2 }
		)).toEqual({ a: 1, b: 2 })
	})
	test('isNumeric', () => {
		expect(isNumeric('123')).toEqual(true)
		expect(isNumeric('123.234')).toEqual(true)
		expect(isNumeric('-23123.234')).toEqual(true)
		expect(isNumeric('123a')).toEqual(false)
		expect(isNumeric('123,1')).toEqual(false)
		expect(isNumeric('asdf')).toEqual(false)
	})
	test('sortEvents', () => {
		expect(sortEvents([
			{ time: 300, value: true, 	references: ['a'], data: {} },
			{ time: 2, value: false, 	references: ['a'], data: {} },
			{ time: 100, value: true, 	references: ['a'], data: {} },
			{ time: 3, value: true, 	references: ['a'], data: {} },
			{ time: 20, value: false, 	references: ['a'], data: {} },
			{ time: 2, value: true, 	references: ['a'], data: {} },
			{ time: 100, value: false, 	references: ['a'], data: {} },
			{ time: 20, value: true, 	references: ['a'], data: {} },
			{ time: 1, value: true, 	references: ['a'], data: {} }
		])).toEqual([
			{ time: 1, value: true, 	references: ['a'], data: {} },
			{ time: 2, value: false, 	references: ['a'], data: {} },
			{ time: 2, value: true, 	references: ['a'], data: {} },
			{ time: 3, value: true, 	references: ['a'], data: {} },
			{ time: 20, value: false, 	references: ['a'], data: {} },
			{ time: 20, value: true, 	references: ['a'], data: {} },
			{ time: 100, value: false, 	references: ['a'], data: {} },
			{ time: 100, value: true, 	references: ['a'], data: {} },
			{ time: 300, value: true, 	references: ['a'], data: {} }
		])
	})
	test('cleanInstances', () => {

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 20, references: ['a'], caps: [{ id: 'p0', start: 0, end: 50 }] },
			{ id: '%b', start: 50, end: 70, references: ['b'], caps: [{ id: 'p1', start: 50, end: 100 }] }
		], true)).toEqual([
			{ id: '%a', start: 10, end: 20, references: ['a'], caps: [{ id: 'p0', start: 0, end: 50 }] },
			{ id: '%b', start: 50, end: 70, references: ['b'], caps: [{ id: 'p1', start: 50, end: 100 }] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'], caps: [{ id: 'p0', start: 0, end: 75 }] },
			{ id: '%b', start: 20, end: 30, references: ['b'], caps: [{ id: 'p1', start: 0, end: 75 }] }
		], true)).toEqual([
			{ id: '%a', start: 10, end: 50, references: ['a', 'b'], caps: [{ id: 'p0', start: 0, end: 75 }, { id: 'p1', start: 0, end: 75 }] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 20, end: 70, references: ['b'] },
			{ id: '%b', start: 10, end: 50, references: ['a'] }
		], true)).toEqual([
			{ id: '%b', start: 10, end: 70, references: ['a', 'b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		], true)).toEqual([
			{ id: '%a', start: 10, end: 70, references: ['a', 'b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		], true, true)).toEqual([ // allow zero-width gaps
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 60, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		], true, true)).toEqual([ // allow zero-width gaps
			{ id: '%a', start: 10, end: 70, references: ['a', 'b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: null, references: ['b'] }
		], true)).toEqual([
			{ id: '%a', start: 10, end: null, references: ['a', 'b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 20, end: 92, references: ['b'] },
			{ id: '%c', start: 100, end: 120, references: ['c'] },
			{ id: '%d', start: 110, end: null, references: ['d'] }
		], true)).toEqual([
			{ id: '%a', start: 10, end: 92, references: ['a', 'b'] },
			{ id: '%c', start: 100, end: null, references: ['c', 'd'] }
		])

		// no merge:

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 20, end: 30, references: ['b'] }
		], false)).toEqual([
			{ id: '%a', start: 10, end: 20, references: ['a'] },
			{ id: '@0', start: 20, end: 30, references: ['b'] },
			{ id: '%b_@1', start: 30, end: 50, references: ['a'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 20, end: 70, references: ['b'] }
		], false)).toEqual([
			{ id: '%a', start: 10, end: 20, references: ['a'] },
			{ id: '@2', start: 20, end: 70, references: ['a', 'b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		], false)).toEqual([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 70, references: ['b'] }
		])
		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: null, references: ['b'] }
		], false)).toEqual([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: null, references: ['b'] }
		])

		expect(cleanInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 20, end: 92, references: ['b'] },
			{ id: '%c', start: 100, end: 120, references: ['c'] },
			{ id: '%d', start: 110, end: null, references: ['d'] }
		], false)).toEqual([
			{ id: '%a', start: 10, end: 20, references: ['a'] },
			{ id: '@3', start: 20, end: 92, references: ['a', 'b'] },
			{ id: '%c', start: 100, end: 110, references: ['c'] },
			{ id: '@4', start: 110, end: null, references: ['c', 'd'] }
		])
		expect(cleanInstances([
			{ id: '@8', start: 1030, end: 1055, references: [ '@1', 'a0' ] },
			{ id: '@e', start: 1055, end: 1080, references: [ '@1', 'a0' ] },
			{ id: '@a', start: 1080, end: 1092, references: [ '@1', 'a0' ] },
			{ id: '@b', start: 1122, end: 1147, references: [ '@2', 'a0', 'a1' ] },
			{ id: '@c', start: 1147, end: 1172, references: [ '@2', 'a0', 'a1' ] },
			{ id: '@d', start: 1172, end: 1184, references: [ '@2', 'a0', 'a1' ] }
		], true, true)).toEqual([
			{ id: '@8', start: 1030, end: 1055, references: [ '@1', 'a0' ] },
			{ id: '@e', start: 1055, end: 1080, references: [ '@1', 'a0' ] },
			{ id: '@a', start: 1080, end: 1092, references: [ '@1', 'a0' ] },
			{ id: '@b', start: 1122, end: 1147, references: [ '@2', 'a0', 'a1' ] },
			{ id: '@c', start: 1147, end: 1172, references: [ '@2', 'a0', 'a1' ] },
			{ id: '@d', start: 1172, end: 1184, references: [ '@2', 'a0', 'a1' ] }
		])
	})
	test('convertEventsToInstances', () => {
		expect(convertEventsToInstances([
			{
				time: 1000,
				value: true,
				data: { instance: { id: 'a0', start: 1000, end: null, references: [] }, id: 'a0' },
				references: [ 'a0' ]
			},
			{
				time: 1000,
				value: false,
				data: { instance: { id: 'a0', start: 1000, end: null, references: [] }, id: 'a0' },
				references: [ 'a0' ] }
		], false)).toEqual([
			{
				id: 'a0',
				start: 1000,
				end: 1000,
				references: ['a0']
			}
		])
	})
	test('invertInstances', () => {
		// Normal:
		expect(invertInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'], caps: [{ id: 'p0', start: 0, end: 75 }] },
			{ id: '%b', start: 100, end: 110, references: ['b'], caps: [{ id: 'p1', start: 75, end: 200 }] }
		])).toMatchObject([
			{ start: 0, end: 10, isFirst: true, references: ['%a', 'a'] },
			{ start: 50, end: 100, references: ['%a', 'a'], caps: [{ id: 'p0', start: 0, end: 75 }] },
			{ start: 110, end: null, references: ['%b', 'b'], caps: [{ id: 'p1', start: 75, end: 200 }] }
		])
		// Empty
		expect(invertInstances([
		])).toMatchObject([
			{ start: 0, end: null, isFirst: true, references: [] }
		])
		// Overlapping:
		expect(invertInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 30, end: 70, references: ['b'] },
			{ id: '%c', start: 100, end: null, references: ['c'] }
		])).toMatchObject([
			{ start: 0, end: 10, isFirst: true, references: ['%a', 'a', 'b'] },
			{ start: 70, end: 100, references: ['%a', 'a', 'b'] }
		])
		// Adjacent:
		expect(invertInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 50, end: 110, references: ['b'] }
		])).toMatchObject([
			{ start: 0, end: 10, isFirst: true, references: ['%a', 'a'] },
			{ start: 50, end: 50, references: ['%a', 'a'] }, // zero-width gap
			{ start: 110, end: null, references: ['%b', 'b'] }
		])

		// Overlapping, then adjacent:
		expect(invertInstances([
			{ id: '%a', start: 10, end: 50, references: ['a'] },
			{ id: '%b', start: 30, end: 100, references: ['b'] },
			{ id: '%c', start: 100, end: 110, references: ['c'] }
		])).toMatchObject([
			{ start: 0, end: 10, isFirst: true, references: ['%a', 'a', 'b'] },
			{ start: 100, end: 100, references: ['%a', 'a', 'b'] },
			{ start: 110, end: null, references: ['%c', 'c'] }
		])
	})
	test('operateOnArrays', () => {
		expect(operateOnArrays(
			[
				{ id: '%a', start: 10, end: 50, references: ['a'] },
				{ id: '%b', start: 30, end: 90, references: ['b'] },
				{ id: '%c', start: 100, end: 110, references: ['c'] }
			],
			{ value: 1, references: ['x'] },
			plus
		)).toMatchObject([
			{ start: 11, end: 31, references: ['%a', 'a', 'x'] },
			{ start: 31, end: 91, references: ['%a', '%b', 'a', 'b', 'x'] },
			{ start: 101, end: 111, references: ['%c', 'c', 'x'] }
		])

		expect(operateOnArrays(
			[
				{ id: '%a', start: 10, end: 30, references: ['a'] },
				{ id: '%b', start: 50, end: 70, references: ['b'] },
				{ id: '%c', start: 100, end: 110, references: ['c'] }
			],
			[
				{ id: '%x', start: 0, end: 25, references: ['x'] },
				{ id: '%y', start: 0, end: 30, references: ['y'] },
				{ id: '%z', start: 1, end: 5, references: ['z'] }
			],
			plus
		)).toMatchObject([
			{ start: 10, end: 50, references: ['%a','%x', 'a','x'] },
			{ start: 50, end: 100, references: ['%a','%b','%x','%y', 'a','b','x','y'] },
			{ start: 101, end: 115, references: ['%c','%z', 'c','z'] }
		])

	})
	/*test('operateOnArraysMulti', () => {

		expect(operateOnArraysMulti(
			[
				{ id: '%a', start: 1, end: 3, references: ['a'] },
				{ id: '%b', start: 5, end: 7, references: ['b'] }
			],
			[
				{ id: '%x', start: 10, end: 20, references: ['x'] },
				{ id: '%y', start: 50, end: 60, references: ['y'] },
				{ id: '%z', start: 60, end: 70, references: ['z'] }
			],
			plus
		)).toMatchObject([
			{ start: 11, end: 13, references: ['%a', '%x', 'a', 'x'] },
			{ start: 15, end: 17, references: ['%b', '%x', 'b', 'x'] },
			{ start: 51, end: 53, references: ['%a', '%y', 'a', 'y'] },
			{ start: 55, end: 57, references: ['%b', '%y', 'b', 'y'] },
			{ start: 61, end: 63, references: ['%a', '%z', 'a', 'z'] },
			{ start: 65, end: 67, references: ['%b', '%z', 'b', 'z'] }
		])
	})*/
	test('applyRepeatingInstances', () => {
		expect(applyRepeatingInstances(
			[
				{ id: '%a', start: 20, end: 30, references: ['a'] },
				{ id: '%b', start: 60, end: 90, references: ['b'] },
				{ id: '%c', start: 100, end: 110, references: ['c'] }
			],
			{ value: 100, references: ['x'] },
			{
				time: 500,
				limitTime: 700,
				limitCount: 999
			}
		)).toMatchObject([
			{ start: 420, end: 430, references: ['%a', 'a', 'x'] },
			{ start: 460, end: 490, references: ['%b', 'b', 'x'] },
			{ start: 500, end: 510, references: ['%c', 'c', 'x'] },

			{ start: 520, end: 530, references: ['%a', 'a', 'x'] },
			{ start: 560, end: 590, references: ['%b', 'b', 'x'] },
			{ start: 600, end: 610, references: ['%c', 'c', 'x'] },

			{ start: 620, end: 630, references: ['%a', 'a', 'x'] },
			{ start: 660, end: 690, references: ['%b', 'b', 'x'] }
			// { start: 700, end: 710, references: ['%c', 'c', 'x'] },
		])
		expect(applyRepeatingInstances(
			[
				{ id: '%a', start: 5, end: 30, references: ['a'] },
				{ id: '%b', start: 20, end: 90, references: ['b'] },
				{ id: '%c', start: 100, end: 110, references: ['c'] }
			],
			{ value: 100, references: ['x'] },
			{
				time: 500,
				limitTime: 700,
				limitCount: 999
			}
		)).toMatchObject([
			{ start: 405, end: 420, references: ['%a', 'a', 'x'] },
			{ start: 420, end: 490, references: ['%a', '%b', 'a', 'b', 'x'] },
			{ start: 500, end: 505, references: ['%c', 'c', 'x'] },

			{ start: 505, end: 520, references: ['%a', '%c', 'a', 'c', 'x'] },
			{ start: 520, end: 590, references: ['%a', '%b', 'a', 'b', 'x'] },
			{ start: 600, end: 605, references: ['%c', 'c', 'x'] },

			{ start: 605, end: 620, references: ['%a', '%c', 'a', 'c', 'x'] },
			{ start: 620, end: 690, references: ['%a', '%b', 'a', 'b', 'x'] }
			// { start: 700, end: 705, references: ['%c', 'c', 'x'] },
		])

		expect(applyRepeatingInstances(
			[
				{ id: '%a', start: 0, end: 15, references: ['g0'], caps: [{ id: 'g0', start: 0, end: 50 }] },
				{ id: '%b', start: 55, end: 65, references: ['g0'], caps: [{ id: 'g0', start: 50, end: 100 }] }
			],
			{ value: 20, references: ['x'] },
			{
				time: 0,
				limitTime: 200,
				limitCount: 999
			}
		)).toMatchObject([
			{ start: 0, end: 15 },
			{ start: 20, end: 35 },
			{ start: 40, end: 50 },

			{ start: 55, end: 65 },
			{ start: 75, end: 85 },
			{ start: 95, end: 100 }
		])

	})
	test('capInstances', () => {

		expect(capInstances([
			{ id: '%a', start: 10, end: 20, references: [''] },
			{ id: '%b', start: 30, end: 40, references: [''] },
			{ id: '%c', start: 50, end: 60, references: [''] },
			{ id: '%d', start: 70, end: 80, references: [''] },
			{ id: '%e', start: 90, end: 100, references: [''] }
		], [
			{ id: '%x', start: 25, end: 55, references: [''] },
			{ id: '%y', start: 60, end: 65, references: [''] },
			{ id: '%z', start: 75, end: 95, references: [''] }
		])).toMatchObject([
			{ id: '%b', start: 30, end: 40, references: [''] },
			{ id: '%c', start: 50, end: 55, references: [''] }, // capped
			// { id: '%d', start: 60, end: 60, references: [''] }, // ?
			{ id: '%d', start: 75, end: 80, references: [''] }, // capped
			{ id: '%e', start: 90, end: 95, references: [''] } // capped
		])
	})
})
