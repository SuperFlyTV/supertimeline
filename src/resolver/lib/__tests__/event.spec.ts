import { sortEvents } from '../event'

test('sortEvents', () => {
	expect(
		sortEvents([
			{ time: 300, value: true, references: ['@@a'], data: {} },
			{ time: 2, value: false, references: ['@@a'], data: {} },
			{ time: 100, value: true, references: ['@@a'], data: {} },
			{ time: 3, value: true, references: ['@@a'], data: {} },
			{ time: 20, value: false, references: ['@@a'], data: {} },
			{ time: 2, value: true, references: ['@@a'], data: {} },
			{ time: 100, value: false, references: ['@@a'], data: {} },
			{ time: 20, value: true, references: ['@@a'], data: {} },
			{ time: 1, value: true, references: ['@@a'], data: {} },
		])
	).toEqual([
		{ time: 1, value: true, references: ['@@a'], data: {} },
		{ time: 2, value: false, references: ['@@a'], data: {} },
		{ time: 2, value: true, references: ['@@a'], data: {} },
		{ time: 3, value: true, references: ['@@a'], data: {} },
		{ time: 20, value: false, references: ['@@a'], data: {} },
		{ time: 20, value: true, references: ['@@a'], data: {} },
		{ time: 100, value: false, references: ['@@a'], data: {} },
		{ time: 100, value: true, references: ['@@a'], data: {} },
		{ time: 300, value: true, references: ['@@a'], data: {} },
	])
})
