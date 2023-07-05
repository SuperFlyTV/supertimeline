import { ResolvedTimelineHandler } from '../ResolvedTimelineHandler'
import { baseInstances } from '../lib/instance'

describe('ResolvedTimelineHandler', () => {
	test('capInstancesToParentInstances', () => {
		const handler = new ResolvedTimelineHandler({ time: 0 })

		expect(
			handler.capInstancesToParentInstances({
				instances: [{ id: '@i0', references: [], start: 0, end: 500 }],
				parentInstances: [{ id: '@p0', references: [], start: 20, end: 30 }],
			})
		).toMatchObject([{ start: 20, end: 30 }])

		expect(
			handler.capInstancesToParentInstances({
				instances: [{ id: '@i0', references: [], start: 10, end: 500 }],
				parentInstances: [{ id: '@p0', references: [], start: 0, end: 30 }],
			})
		).toMatchObject([{ start: 10, end: 30 }])

		expect(
			handler.capInstancesToParentInstances({
				instances: [{ id: '@i0', references: [], start: 10, end: 500 }],
				parentInstances: [{ id: '@p0', references: [], start: 0, end: 100 }],
			})
		).toMatchObject([{ start: 10, end: 100 }])
		{
			expect(
				baseInstances(
					handler.capInstancesToParentInstances({
						instances: [
							{ id: '@i0', references: [], start: 0, end: 499 },
							{ id: '@i1', references: [], start: 500, end: 1000 },
						],
						parentInstances: [
							{ id: '@p0', references: [], start: 0, end: 1 },
							{ id: '@p1', references: [], start: 500, end: 501 },
						],
					})
				)
			).toMatchObject([
				{ start: 0, end: 1 },
				{ start: 500, end: 501 },
			])
		}
		{
			expect(
				baseInstances(
					handler.capInstancesToParentInstances({
						instances: [
							{ id: '@i0', references: [], start: 0, end: 1 },
							{ id: '@i1', references: [], start: 500, end: 501 },
							{ id: '@i2', references: [], start: 501, end: 2501 },
						],
						parentInstances: [
							{ id: '@p0', references: [], start: 0, end: 1 },
							{ id: '@p1', references: [], start: 500, end: 501 },
							{ id: '@p2', references: [], start: 501, end: null },
						],
					})
				)
			).toMatchObject([
				{ start: 0, end: 1 },
				{ start: 500, end: 501 },
				{ start: 501, end: 2501 },
			])
		}
		{
			expect(
				baseInstances(
					handler.capInstancesToParentInstances({
						instances: [
							{ id: '@i0', references: [], start: 0, end: 499 },
							{ id: '@i1', references: [], start: 500, end: 501 },
							{ id: '@i2', references: [], start: 501, end: 2501 },
						],
						parentInstances: [
							{ id: '@p0', references: [], start: 0, end: 1 },
							{ id: '@p1', references: [], start: 500, end: 501 },
						],
					})
				)
			).toMatchObject([
				{ start: 0, end: 1 },
				{ start: 500, end: 501 },
				{ start: 501, end: 501 },
			])
		}
	})
})
