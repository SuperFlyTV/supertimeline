import { StateHandler } from '../StateHandler'

describe('state', () => {
	test('applyKeyframeContent', () => {
		const o: any = {}
		const o2: any = {
			a: 1,
			b: {
				c: 2,
			},
			c: [
				1,
				{
					a: 3,
				},
			],
		}
		StateHandler.applyKeyframeContent(o, o2)
		expect(o).toEqual(o2)

		StateHandler.applyKeyframeContent(o, {
			b: { c: 4, d: 42 },
		})
		o2.b = { c: 4, d: 42 }
		expect(o).toEqual(o2)

		StateHandler.applyKeyframeContent(o, {
			c: [5],
		})
		o2.c = [5]
		expect(o).toEqual(o2)

		StateHandler.applyKeyframeContent(o, {
			c: [
				{ a: 1, b: 2 },
				{ a: 3, b: 4 },
			],
		})
		o2.c = [
			{ a: 1, b: 2 },
			{ a: 3, b: 4 },
		]
		expect(o).toEqual(o2)

		StateHandler.applyKeyframeContent(o, {
			c: { b: 1 },
		})
		o2.c = { b: 1 }
		expect(o).toEqual(o2)
	})
})
