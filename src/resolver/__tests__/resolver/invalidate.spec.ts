import { TimelineObject, Resolver } from '../../..'

function clone<T>(o: T): T {
	return JSON.parse(JSON.stringify(o))
}
describe('Resolver, using Cache', () => {
	beforeEach(() => {
		// resetId()
	})
	test('Changing timeline', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video',
				layer: '0',
				enable: {
					start: 0,
					end: 100,
				},
				content: {},
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video.start + 10', // 10
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.end + 10', // 30
					duration: 15,
				},
				content: {},
			},
		]
		const cache = {}
		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved.statistics.resolvingCount).toEqual(3)
		expect(resolved.statistics.resolvedObjectCount).toEqual(3)
		expect(resolved.statistics.unresolvedCount).toEqual(0)
		expect(resolved.objects['video'].resolved).toMatchObject({ instances: [{ start: 0, end: 100 }] })
		expect(resolved.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 30, end: 45 }] })

		// make a small change in timeline:
		// @ts-ignore
		timeline[2].enable.start = '#graphic0.end + 15' // 35

		const resolved2 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))
		expect(resolved2.statistics.resolvingCount).toEqual(1)
		expect(resolved2.objects['video'].resolved).toMatchObject({ instances: [{ start: 0, end: 100 }] })
		expect(resolved2.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved2.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 35, end: 50 }] })

		// make another change in timeline:
		// @ts-ignore
		timeline[0].enable.start = 10

		const resolved3 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))
		expect(resolved3.statistics.resolvingCount).toEqual(3)
		expect(resolved3.objects['video'].resolved).toMatchObject({ instances: [{ start: 10, end: 100 }] })
		expect(resolved3.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved3.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 45, end: 60 }] })

		// run the exact thing again, with no timeline changes:
		const resolved4 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))
		expect(resolved4.statistics.resolvingCount).toEqual(0)
		expect(resolved4.objects['video'].resolved).toMatchObject({ instances: [{ start: 10, end: 100 }] })
		expect(resolved4.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved4.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 45, end: 60 }] })
	})
	test('Reference class', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 10,
					duration: 10,
				},
				content: {},
				classes: ['someVideo0'],
			},
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '.someVideo0.end',
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '.someVideo1.end',
					duration: 10,
				},
				content: {},
			},
		]
		const cache = {}
		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved.statistics.resolvingCount).toEqual(3)
		expect(resolved.objects['video0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved.objects['graphic1']).toBeFalsy()

		// change the timeline
		// @ts-ignore
		timeline[0].enable.start = 20

		const resolved2 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved2.statistics.resolvingCount).toEqual(2)
		expect(resolved2.objects['video0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved2.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 30, end: 40 }] })
		expect(resolved2.objects['graphic1']).toBeFalsy()

		// change the class
		timeline[0].classes = ['someVideo1']

		const resolved3 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved3.statistics.resolvingCount).toEqual(3)
		expect(resolved3.objects['video0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved3.objects['graphic0']).toBeFalsy()
		expect(resolved3.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 30, end: 40 }] })
	})
	test('Reference layer', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'video0',
				layer: '0',
				enable: {
					start: 10,
					duration: 10,
				},
				content: {},
				classes: ['someVideo0'],
			},
			{
				id: 'graphic0',
				layer: '9',
				enable: {
					start: '$0.end',
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '10',
				enable: {
					start: '$1.end',
					duration: 10,
				},
				content: {},
			},
		]
		const cache = {}
		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved.statistics.resolvingCount).toEqual(3)
		expect(resolved.objects['video0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved.objects['graphic1']).toBeFalsy()

		// change the timeline
		// @ts-ignore
		timeline[0].enable.start = 20

		const resolved2 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved2.statistics.resolvingCount).toEqual(2)
		expect(resolved2.objects['video0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved2.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 30, end: 40 }] })
		expect(resolved2.objects['graphic1']).toBeFalsy()

		// change the layer
		timeline[0].layer = '1'

		const resolved3 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved3.statistics.resolvingCount).toEqual(3)
		expect(resolved3.objects['video0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved3.objects['graphic0']).toBeFalsy()
		expect(resolved3.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 30, end: 40 }] })
	})
	test('Adding & removing objects', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'graphic0',
				layer: '1',
				enable: {
					start: '#video0.start + 10',
					duration: 10,
				},
				content: {},
			},
			{
				id: 'graphic1',
				layer: '1',
				enable: {
					start: '#graphic0.start | #video1.start',
					duration: 15,
				},
				content: {},
			},
			{
				id: 'video1',
				layer: '2',
				enable: {
					start: 100,
					duration: 10,
				},
				content: {},
				classes: ['someVideo'],
			},
		]
		const cache = {}
		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved.statistics.resolvingCount).toEqual(3)
		expect(resolved.objects['graphic0']).toBeFalsy()
		expect(resolved.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 100, end: 115 }] })
		expect(resolved.objects['video1'].resolved).toMatchObject({ instances: [{ start: 100, end: 110 }] })

		// Add an object to the timeline
		timeline.push({
			id: 'video0',
			layer: '0',
			enable: {
				start: 0,
				end: 100,
			},
			content: {},
		})
		const resolved2 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))
		expect(resolved2.statistics.resolvingCount).toEqual(3)
		expect(resolved2.objects['video0'].resolved).toMatchObject({ instances: [{ start: 0, end: 100 }] })
		expect(resolved2.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved2.objects['video1'].resolved).toMatchObject({ instances: [{ start: 100, end: 110 }] })
		expect(resolved2.objects['graphic1'].resolved).toMatchObject({
			instances: [
				{ start: 20, end: 25 },
				{ start: 100, end: 115 },
			],
		})

		// Remove an object from the timeline
		timeline.splice(2, 1) // video1

		const resolved3 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))
		expect(resolved3.statistics.resolvingCount).toEqual(1)
		expect(resolved3.objects['video0'].resolved).toMatchObject({ instances: [{ start: 0, end: 100 }] })
		expect(resolved3.objects['graphic0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved3.objects['graphic1'].resolved).toMatchObject({ instances: [{ start: 20, end: 25 }] })
		expect(resolved3.objects['video1']).toBeFalsy()
	})

	test('Updating objects', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'obj0',
				layer: '1',
				enable: {
					start: 0,
				},
				content: {
					a: 1,
				},
			},
		]

		const cache = {}

		{
			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

			expect(resolved.statistics.resolvingCount).toEqual(1)
			expect(resolved.objects['obj0'].resolved).toMatchObject({ instances: [{ start: 0, end: null }] })

			const state = Resolver.getState(resolved, 1000)
			expect(state.layers['1']).toBeTruthy()
			expect(state.layers['1'].content).toEqual({ a: 1 })
		}

		{
			const timeline2: TimelineObject[] = clone(timeline)
			timeline2[0].content.a = 2
			// @ts-ignore illegal, but possible
			timeline2[0].otherProperty = 42

			const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline2, { time: 0, cache }))

			expect(resolved.objects['obj0'].resolved).toMatchObject({ instances: [{ start: 0, end: null }] })

			const state = Resolver.getState(resolved, 1000)
			expect(state.layers['1']).toBeTruthy()
			expect(state.layers['1'].content).toEqual({ a: 2 })
			// @ts-ignore
			expect(state.layers['1'].otherProperty).toEqual(42)
		}
	})

	test('Reference group', () => {
		const timeline: TimelineObject[] = [
			{
				id: 'group0',
				layer: '0',
				enable: {
					start: 10,
					duration: 100,
				},
				content: {},
				classes: [],
				isGroup: true,
				children: [
					{
						id: 'video0',
						layer: '9',
						enable: {
							start: '0',
							duration: 10,
						},
						content: {},
					},
				],
			},
			{
				id: 'video1',
				layer: '10',
				enable: {
					start: '#video0.end',
					duration: 10,
				},
				content: {},
			},
		]
		const cache = {}
		const resolved = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved.statistics.resolvingCount).toEqual(3)
		expect(resolved.objects['group0'].resolved).toMatchObject({ instances: [{ start: 10, end: 110 }] })
		expect(resolved.objects['video0'].resolved).toMatchObject({ instances: [{ start: 10, end: 20 }] })
		expect(resolved.objects['video1'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })

		// change the group
		// @ts-ignore
		timeline[0].enable.start = 20

		const resolved2 = Resolver.resolveAllStates(Resolver.resolveTimeline(timeline, { time: 0, cache }))

		expect(resolved2.statistics.resolvingCount).toEqual(3)
		expect(resolved2.objects['group0'].resolved).toMatchObject({ instances: [{ start: 20, end: 120 }] })
		expect(resolved2.objects['video0'].resolved).toMatchObject({ instances: [{ start: 20, end: 30 }] })
		expect(resolved2.objects['video1'].resolved).toMatchObject({ instances: [{ start: 30, end: 40 }] })
	})
})
