import {
	extendMandadory,
	isNumeric,
	sortEvents,
	cleanInstances,
	invertInstances,
	operateOnArrays,
	applyRepeatingInstances,
	capInstances,
	operateOnArraysMulti
} from '../lib'

describe('lib', () => {
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
			{ time: 300, value: true },
			{ time: 2, value: false },
			{ time: 100, value: true },
			{ time: 3, value: true },
			{ time: 20, value: false },
			{ time: 2, value: true },
			{ time: 100, value: false },
			{ time: 20, value: true },
			{ time: 1, value: true }
		])).toEqual([
			{ time: 1, value: true },
			{ time: 2, value: false },
			{ time: 2, value: true },
			{ time: 3, value: true },
			{ time: 20, value: false },
			{ time: 20, value: true },
			{ time: 100, value: false },
			{ time: 100, value: true },
			{ time: 300, value: true }
		])
	})
	test('cleanInstances', () => {
		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 20, end: 30 }
		], true)).toEqual([
			{ start: 10, end: 50 }
		])

		expect(cleanInstances([
			{ start: 20, end: 70 },
			{ start: 10, end: 50 }
		], true)).toEqual([
			{ start: 10, end: 70 }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: 70 }
		], true)).toEqual([
			{ start: 10, end: 70 }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: 70 }
		], true, true)).toEqual([ // allow zero-width gaps
			{ start: 10, end: 50 },
			{ start: 50, end: 70 }
		])

		expect(cleanInstances([
			{ start: 10, end: 60 },
			{ start: 50, end: 70 }
		], true, true)).toEqual([ // allow zero-width gaps
			{ start: 10, end: 70 }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: null }
		], true)).toEqual([
			{ start: 10, end: null }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 20, end: 92 },
			{ start: 100, end: 120 },
			{ start: 110, end: null }
		], true)).toEqual([
			{ start: 10, end: 92 },
			{ start: 100, end: null }
		])

		// no merge:

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 20, end: 30 }
		], false)).toEqual([
			{ start: 10, end: 50 },
			{ start: 20, end: 30 }
		])

		expect(cleanInstances([
			{ start: 20, end: 70 },
			{ start: 10, end: 50 }
		], false)).toEqual([
			{ start: 10, end: 20 },
			{ start: 20, end: 70 }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: 70 }
		], false)).toEqual([
			{ start: 10, end: 50 },
			{ start: 50, end: 70 }
		])
		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: null }
		], false)).toEqual([
			{ start: 10, end: 50 },
			{ start: 50, end: null }
		])

		expect(cleanInstances([
			{ start: 10, end: 50 },
			{ start: 20, end: 92 },
			{ start: 100, end: 120 },
			{ start: 110, end: null }
		], false)).toEqual([
			{ start: 10, end: 20 },
			{ start: 20, end: 92 },
			{ start: 100, end: 110 },
			{ start: 110, end: null }
		])
	})
	test('invertInstances', () => {

		expect(invertInstances([
			{ start: 10, end: 50 },
			{ start: 100, end: 110 }
		])).toEqual([
			{ start: 0, end: 10, isFirst: true },
			{ start: 50, end: 100 },
			{ start: 110, end: null }
		])

		expect(invertInstances([
			{ start: 30, end: 70 },
			{ start: 100, end: null },
			{ start: 10, end: 50 }
		])).toEqual([
			{ start: 0, end: 10, isFirst: true },
			{ start: 70, end: 100 }
		])

		expect(invertInstances([
			{ start: 30, end: 100 },
			{ start: 10, end: 50 },
			{ start: 100, end: 110 }
		])).toEqual([
			{ start: 0, end: 10, isFirst: true },
			{ start: 100, end: 100 },
			{ start: 110, end: null }
		])

		expect(invertInstances([
			{ start: 10, end: 50 },
			{ start: 50, end: 110 }
		])).toEqual([
			{ start: 0, end: 10, isFirst: true },
			{ start: 50, end: 50 }, // zero-width gap
			{ start: 110, end: null }
		])
	})
	test('operateOnArrays', () => {
		const plus = (a: number | null, b: number | null): number | null => {
			if (a === null || b === null) return null
			return a + b
		}

		expect(operateOnArrays(
			[
				{ start: 30, end: 90 },
				{ start: 10, end: 50 },
				{ start: 100, end: 110 }
			],
			1,
			plus
		)).toEqual([
			{ start: 11, end: 31 },
			{ start: 31, end: 91 },
			{ start: 101, end: 111 }
		])

		expect(operateOnArrays(
			[
				{ start: 10, end: 30 },
				{ start: 50, end: 70 },
				{ start: 100, end: 110 }
			],
			[
				{ start: 0, end: 25 },
				{ start: 0, end: 30 },
				{ start: 1, end: 5 }
			],
			plus
		)).toEqual([
			{ start: 10, end: 50 },
			{ start: 50, end: 100 },
			{ start: 101, end: 115 }
		])

	})
	test('operateOnArraysMulti', () => {
		const plus = (a: number | null, b: number | null): number | null => {
			if (a === null || b === null) return null
			return a + b
		}

		expect(operateOnArraysMulti(
			[
				{ start: 1, end: 3 },
				{ start: 5, end: 7 }
			],
			[
				{ start: 10, end: 20 },
				{ start: 50, end: 60 },
				{ start: 60, end: 70 }
			],
			plus
		)).toEqual([
			{ start: 11, end: 13 },
			{ start: 15, end: 17 },
			{ start: 51, end: 53 },
			{ start: 55, end: 57 },
			{ start: 61, end: 63 },
			{ start: 65, end: 67 }
		])

	})
	test('applyRepeatingInstances', () => {
		expect(applyRepeatingInstances(
			[
				{ start: 20, end: 30 },
				{ start: 60, end: 90 },
				{ start: 100, end: 110 }
			],
			100,
			{
				time: 500,
				limitTime: 700,
				limitCount: 999
			}
		)).toEqual([
			{ start: 420, end: 430 },
			{ start: 460, end: 490 },
			{ start: 500, end: 510 },

			{ start: 520, end: 530 },
			{ start: 560, end: 590 },
			{ start: 600, end: 610 },

			{ start: 620, end: 630 },
			{ start: 660, end: 690 }
			// { start: 700, end: 710 },
		])

		expect(applyRepeatingInstances(
			[
				{ start: 5, end: 30 },
				{ start: 20, end: 90 },
				{ start: 100, end: 110 }
			],
			100,
			{
				time: 500,
				limitTime: 700,
				limitCount: 999
			}
		)).toEqual([
			{ start: 405, end: 420 },
			{ start: 420, end: 490 },
			{ start: 500, end: 505 },

			{ start: 505, end: 520 },
			{ start: 520, end: 590 },
			{ start: 600, end: 605 },

			{ start: 605, end: 620 },
			{ start: 620, end: 690 }
			// { start: 700, end: 705 },
		])

	})
	test('capInstances', () => {

		expect(capInstances([
			{ start: 10, end: 20 },
			{ start: 30, end: 40 },
			{ start: 50, end: 60 },
			{ start: 70, end: 80 },
			{ start: 90, end: 100 }
		], [
			{ start: 25, end: 55 },
			{ start: 60, end: 65 },
			{ start: 75, end: 95 }
		])).toEqual([
			{ start: 30, end: 40 },
			{ start: 50, end: 55 }, // capped
			// { start: 60, end: 60 }, // ?
			{ start: 75, end: 80 }, // capped
			{ start: 90, end: 95 } // capped
		])
	})
})
