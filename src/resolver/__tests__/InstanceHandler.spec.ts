import { InstanceHandler } from '../InstanceHandler'
import { ResolvedTimelineHandler } from '../ResolvedTimelineHandler'
import { baseInstances } from '../lib/instance'

test('cleanInstances', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 20, references: ['#a'], caps: [{ id: '@p0', start: 0, end: 50 }] },
				{ id: '@b', start: 50, end: 70, references: ['#b'], caps: [{ id: '@p1', start: 50, end: 100 }] },
			],
			true
		)
	).toEqual([
		{ id: '@a', start: 10, end: 20, references: ['#a'], caps: [{ id: '@p0', start: 0, end: 50 }] },
		{ id: '@b', start: 50, end: 70, references: ['#b'], caps: [{ id: '@p1', start: 50, end: 100 }] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'], caps: [{ id: '@p0', start: 0, end: 75 }] },
				{ id: '@b', start: 20, end: 30, references: ['#b'], caps: [{ id: '@p1', start: 0, end: 75 }] },
			],
			true
		)
	).toEqual([{ id: '@a', start: 10, end: 50, references: ['#a', '#b'], caps: [{ id: '@p0', start: 0, end: 75 }] }])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 20, end: 70, references: ['#b'] },
				{ id: '@b', start: 10, end: 50, references: ['#a'] },
			],
			true
		)
	).toEqual([{ id: '@b', start: 10, end: 70, references: ['#a', '#b'] }])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: 70, references: ['#b'] },
			],
			true
		)
	).toEqual([{ id: '@a', start: 10, end: 70, references: ['#a', '#b'] }])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: 70, references: ['#b'] },
			],
			true,
			true
		)
	).toEqual([
		// allow zero-width gaps
		{ id: '@a', start: 10, end: 50, references: ['#a'] },
		{ id: '@b', start: 50, end: 70, references: ['#b'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 60, references: ['#a'] },
				{ id: '@b', start: 50, end: 70, references: ['#b'] },
			],
			true,
			true
		)
	).toEqual([
		// allow zero-width gaps
		{ id: '@a', start: 10, end: 70, references: ['#a', '#b'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: null, references: ['#b'] },
			],
			true
		)
	).toEqual([{ id: '@a', start: 10, end: null, references: ['#a', '#b'] }])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 20, end: 92, references: ['#b'] },
				{ id: '@c', start: 100, end: 120, references: ['#c'] },
				{ id: '@d', start: 110, end: null, references: ['#d'] },
			],
			true
		)
	).toEqual([
		{ id: '@a', start: 10, end: 92, references: ['#a', '#b'] },
		{ id: '@c', start: 100, end: null, references: ['#c', '#d'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: 50, references: ['#b'] },
				{ id: '@c', start: 50, end: 51, references: ['#c'] },
			],
			true
		)
	).toEqual([{ id: '@a', start: 10, end: 51, references: ['#a', '#b', '#c'] }])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 10, references: ['#a'] },
				{ id: '@b', start: 10, end: null, references: ['#b'] },
			],
			true
		)
	).toEqual([{ id: '@a', start: 10, end: null, references: ['#a', '#b'] }])

	// no merge:

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 20, end: 30, references: ['#b'] },
			],
			false
		)
	).toEqual([
		{ id: '@a', start: 10, end: 20, references: ['#a'] },
		{ id: '@0', start: 20, end: 30, references: ['#b'] },
		{ id: '@b_@1', start: 30, end: 50, references: ['#a'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 20, end: 70, references: ['#b'] },
			],
			false
		)
	).toEqual([
		{ id: '@a', start: 10, end: 20, references: ['#a'] },
		{ id: '@2', start: 20, end: 70, references: ['#a', '#b'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: 70, references: ['#b'] },
			],
			false
		)
	).toEqual([
		{ id: '@a', start: 10, end: 50, references: ['#a'] },
		{ id: '@b', start: 50, end: 70, references: ['#b'] },
	])
	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 50, end: null, references: ['#b'] },
			],
			false
		)
	).toEqual([
		{ id: '@a', start: 10, end: 50, references: ['#a'] },
		{ id: '@b', start: 50, end: null, references: ['#b'] },
	])

	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 10, end: 50, references: ['#a'] },
				{ id: '@b', start: 20, end: 92, references: ['#b'] },
				{ id: '@c', start: 100, end: 120, references: ['#c'] },
				{ id: '@d', start: 110, end: null, references: ['#d'] },
			],
			false
		)
	).toEqual([
		{ id: '@a', start: 10, end: 20, references: ['#a'] },
		{ id: '@3', start: 20, end: 92, references: ['#a', '#b'] },
		{ id: '@c', start: 100, end: 110, references: ['#c'] },
		{ id: '@4', start: 110, end: null, references: ['#c', '#d'] },
	])
	expect(
		instance.cleanInstances(
			[
				{ id: '@8', start: 1030, end: 1055, references: ['#@1', '#a0'] },
				{ id: '@e', start: 1055, end: 1080, references: ['#@1', '#a0'] },
				{ id: '@a', start: 1080, end: 1092, references: ['#@1', '#a0'] },
				{ id: '@b', start: 1122, end: 1147, references: ['#@2', '#a0', '#a1'] },
				{ id: '@c', start: 1147, end: 1172, references: ['#@2', '#a0', '#a1'] },
				{ id: '@d', start: 1172, end: 1184, references: ['#@2', '#a0', '#a1'] },
			],
			true,
			true
		)
	).toEqual([
		{ id: '@8', start: 1030, end: 1055, references: ['#@1', '#a0'] },
		{ id: '@e', start: 1055, end: 1080, references: ['#@1', '#a0'] },
		{ id: '@a', start: 1080, end: 1092, references: ['#@1', '#a0'] },
		{ id: '@b', start: 1122, end: 1147, references: ['#@2', '#a0', '#a1'] },
		{ id: '@c', start: 1147, end: 1172, references: ['#@2', '#a0', '#a1'] },
		{ id: '@d', start: 1172, end: 1184, references: ['#@2', '#a0', '#a1'] },
	])
})

test('cleanInstances 2', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	expect(
		instance.cleanInstances(
			[
				{ id: '@a', start: 1, end: null, references: ['#a'] },
				{ id: '@b', start: 500, end: 1000, references: ['#b'], caps: [{ id: '@p0', start: 500, end: 1000 }] },
			],
			true,
			true
		)
	).toEqual([{ id: '@a', start: 1, end: null, references: ['#a', '#b'] }])
})
test('cleanInstances 3', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	expect(
		instance.cleanInstances(
			[{ id: '@a', start: 50, end: 60, references: ['#a'], originalStart: 10, originalEnd: 100 }],
			true,
			true
		)
	).toEqual([{ id: '@a', start: 50, end: 60, references: ['#a'], originalStart: 10, originalEnd: 100 }])
	expect(
		instance.cleanInstances(
			[
				{ id: '@b', start: 30, end: 40, references: [] },
				{ id: '@c', start: 50, end: 55, references: [], originalEnd: 60 },
				{ id: '@c1', start: 60, end: 60, references: [], originalStart: 50 },
				{ id: '@d', start: 75, end: 80, references: [], originalStart: 70 },
				{ id: '@e', start: 90, end: 95, references: [], originalEnd: 100 },
			],
			true,
			true
		)
	).toEqual([
		{ id: '@b', start: 30, end: 40, references: [], caps: undefined },
		{ id: '@c', start: 50, end: 55, references: [], caps: undefined, originalEnd: 60 },
		{ id: '@c1', start: 60, end: 60, references: [], caps: undefined, originalStart: 50 },
		{ id: '@d', start: 75, end: 80, references: [], caps: undefined, originalStart: 70 },
		{ id: '@e', start: 90, end: 95, references: [], caps: undefined, originalEnd: 100 },
	])
})
test('convertEventsToInstances', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	expect(
		instance.convertEventsToInstances(
			[
				{
					time: 1000,
					value: true,
					data: { instance: { id: '@a0', start: 1000, end: null, references: [] }, id: 'a0' },
					references: ['#a0'],
				},
				{
					time: 1000,
					value: false,
					data: { instance: { id: '@a0', start: 1000, end: null, references: [] }, id: 'a0' },
					references: ['#a0'],
				},
			],
			false
		)
	).toEqual([
		{
			id: '@a0',
			start: 1000,
			end: 1000,
			references: ['#a0'],
		},
	])
})
test('invertInstances', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	// Normal:
	expect(
		instance.invertInstances([
			{ id: '@a', start: 10, end: 50, references: ['#a'], caps: [{ id: '@p0', start: 0, end: 75 }] },
			{ id: '@b', start: 100, end: 110, references: ['#b'], caps: [{ id: '@p1', start: 75, end: 200 }] },
		])
	).toMatchObject([
		{ start: 0, end: 10, isFirst: true, references: ['#a', '@@a'] },
		{ start: 50, end: 100, references: ['#a', '@@a'], caps: [{ id: '@p0', start: 0, end: 75 }] },
		{ start: 110, end: null, references: ['#b', '@@b'], caps: [{ id: '@p1', start: 75, end: 200 }] },
	])
	// Empty
	expect(instance.invertInstances([])).toMatchObject([{ start: 0, end: null, isFirst: true, references: [] }])
	// Overlapping:
	expect(
		instance.invertInstances([
			{ id: '@a', start: 10, end: 50, references: ['#a'] },
			{ id: '@b', start: 30, end: 70, references: ['#b'] },
			{ id: '@c', start: 100, end: null, references: ['#c'] },
		])
	).toMatchObject([
		{ start: 0, end: 10, isFirst: true, references: ['#a', '#b', '@@a'] },
		{ start: 70, end: 100, references: ['#a', '#b', '@@a'] },
	])
	// Adjacent:
	expect(
		instance.invertInstances([
			{ id: '@a', start: 10, end: 50, references: ['#a'] },
			{ id: '@b', start: 50, end: 110, references: ['#b'] },
		])
	).toMatchObject([
		{ start: 0, end: 10, isFirst: true, references: ['#a', '@@a'] },
		{ start: 50, end: 50, references: ['#a', '@@a'] }, // zero-width gap
		{ start: 110, end: null, references: ['#b', '@@b'] },
	])

	// Overlapping, then adjacent:
	expect(
		instance.invertInstances([
			{ id: '@a', start: 10, end: 50, references: ['#a'] },
			{ id: '@b', start: 30, end: 100, references: ['#b'] },
			{ id: '@c', start: 100, end: 110, references: ['#c'] },
		])
	).toMatchObject([
		{ start: 0, end: 10, isFirst: true, references: ['#a', '#b', '@@a'] },
		{ start: 100, end: 100, references: ['#a', '#b', '@@a'] },
		{ start: 110, end: null, references: ['#c', '@@c'] },
	])
})
test('applyRepeatingInstances', () => {
	{
		const resolvedTimeline = new ResolvedTimelineHandler({
			time: 500,
			limitTime: 700,
			limitCount: 999,
		})
		const instance = new InstanceHandler(resolvedTimeline)
		expect(
			instance.applyRepeatingInstances(
				[
					{ id: '@a', start: 20, end: 30, references: ['#a'] },
					{ id: '@b', start: 60, end: 90, references: ['#b'] },
					{ id: '@c', start: 100, end: 110, references: ['#c'] },
				],
				{ value: 100, references: ['#x'] }
			)
		).toMatchObject([
			{ start: 420, end: 430, references: ['#a', '#x', '@@a'] },
			{ start: 460, end: 490, references: ['#b', '#x', '@@b'] },
			{ start: 500, end: 510, references: ['#c', '#x', '@@c'] },

			{ start: 520, end: 530, references: ['#a', '#x', '@@a'] },
			{ start: 560, end: 590, references: ['#b', '#x', '@@b'] },
			{ start: 600, end: 610, references: ['#c', '#x', '@@c'] },

			{ start: 620, end: 630, references: ['#a', '#x', '@@a'] },
			{ start: 660, end: 690, references: ['#b', '#x', '@@b'] },
		])
	}
	{
		const resolvedTimeline = new ResolvedTimelineHandler({
			time: 500,
			limitTime: 700,
			limitCount: 999,
		})
		const instance = new InstanceHandler(resolvedTimeline)
		expect(
			instance.applyRepeatingInstances(
				[
					{ id: '@a', start: 5, end: 30, references: ['#a'] },
					{ id: '@b', start: 20, end: 90, references: ['#b'] },
					{ id: '@c', start: 100, end: 110, references: ['#c'] },
				],
				{ value: 100, references: ['#x'] }
			)
		).toMatchObject([
			{ start: 405, end: 420, references: ['#a', '#x', '@@a'] },
			{ start: 420, end: 490, references: ['#a', '#b', '#x', '@@a', '@@b'] },
			{ start: 500, end: 505, references: ['#c', '#x', '@@c'] },

			{ start: 505, end: 520, references: ['#a', '#c', '#x', '@@a', '@@c'] },
			{ start: 520, end: 590, references: ['#a', '#b', '#x', '@@a', '@@b'] },
			{ start: 600, end: 605, references: ['#c', '#x', '@@c'] },

			{ start: 605, end: 620, references: ['#a', '#c', '#x', '@@a', '@@c'] },
			{ start: 620, end: 690, references: ['#a', '#b', '#x', '@@a', '@@b'] },
		])
	}
	{
		const resolvedTimeline = new ResolvedTimelineHandler({
			time: 0,
			limitTime: 200,
			limitCount: 999,
		})
		const instance = new InstanceHandler(resolvedTimeline)
		const repeating = baseInstances(
			instance.applyRepeatingInstances(
				[
					{
						id: '@a',
						start: 0,
						end: 15,
						references: ['@@g0'],
						caps: [{ id: '@g0', start: 0, end: 50 }],
					},
					{
						id: '@b',
						start: 55,
						end: 65,
						references: ['@@g0'],
						caps: [{ id: '@g0', start: 50, end: 100 }],
					},
				],
				{ value: 20, references: ['#x'] }
			)
		)
		expect(repeating).toMatchObject([
			{ start: 0, end: 15 },
			{ start: 20, end: 35 },
			{ start: 40, end: 50 },

			{ start: 55, end: 65 },
			{ start: 75, end: 85 },
			{ start: 95, end: 100 },
		])
	}
})
test('capInstances', () => {
	const resolvedTimeline = new ResolvedTimelineHandler({ time: 0 })
	const instance = new InstanceHandler(resolvedTimeline)
	expect(
		instance.capInstances(
			[{ id: '@a', start: 10, end: 20, references: ['#abc'] }],
			[{ id: '@x', start: 1, end: 100, references: ['#def'] }]
		)
	).toMatchObject([{ id: '@a', start: 10, end: 20, references: ['#abc', '#def'] }])

	expect(
		instance.capInstances(
			[{ id: '@a', start: 10, end: 100, references: ['#abc'] }],
			[{ id: '@x', start: 50, end: 60, references: ['#def'] }]
		)
	).toMatchObject([
		{ id: '@a', start: 50, end: 60, references: ['#abc', '#def'], originalStart: 10, originalEnd: 100 },
	])

	expect(
		instance.capInstances(
			[
				{ id: '@a', start: 10, end: 20, references: [] },
				{ id: '@b', start: 30, end: 40, references: [] },
				{ id: '@c', start: 50, end: 60, references: [] },
				{ id: '@d', start: 70, end: 80, references: [] },
				{ id: '@e', start: 90, end: 100, references: [] },
			],
			[
				{ id: '@x', start: 25, end: 55, references: [] },
				{ id: '@y', start: 60, end: 65, references: [] },
				{ id: '@z', start: 75, end: 95, references: [] },
			]
		)
	).toMatchObject([
		{ id: '@b', start: 30, end: 40, references: [] },
		{ id: '@c', start: 50, end: 55, references: [], originalEnd: 60 }, // capped
		{ id: '@c1', start: 60, end: 60, references: [] }, // ?
		{ id: '@d', start: 75, end: 80, references: [] }, // capped
		{ id: '@e', start: 90, end: 95, references: [] }, // capped
	])

	expect(
		instance.capInstances(
			[{ id: '@a', start: 10, end: 20, references: [] }],
			[{ id: '@x', start: 15, end: 15, references: [] }]
		)
	).toMatchObject([
		{ id: '@a', start: 15, end: 15, references: [] }, // capped
	])

	expect(
		instance.capInstances(
			[{ id: '@a', start: 10, end: null, references: [] }],
			[{ id: '@x', start: 10, end: 10, references: [] }]
		)
	).toMatchObject([
		{ id: '@a', start: 10, end: 10, references: [] }, // capped
	])

	expect(
		instance.capInstances(
			[{ id: '@a', start: 0, end: null, references: [] }],
			[
				{ id: '@x', start: 10, end: 20, references: [] },
				{ id: '@y', start: 30, end: 31, references: [] },
				{ id: '@z', start: 31, end: 50, references: [] },
			]
		)
	).toMatchObject([
		{ id: '@a', start: 10, end: 20, references: [] }, // capped
		{ id: '@a1', start: 30, end: 31, references: [] }, // capped
		{ id: '@a2', start: 31, end: 50, references: [] }, // capped
	])

	expect(
		instance.capInstances(
			[{ id: '@a', start: 0, end: null, references: [] }],
			[
				{ id: '@x', start: 10, end: 50, references: [] },
				{ id: '@y', start: 20, end: 100, references: [] },
			]
		)
	).toMatchObject([
		{ id: '@a', start: 10, end: 100, references: [] }, // capped
	])
})
