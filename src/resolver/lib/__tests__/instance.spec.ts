import { getInstanceUnion } from '../instance'

test('getInstanceUnion', () => {
	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 1, end: 13 })).toMatchObject({ start: 10, end: 13 })
	expect(getInstanceUnion({ start: 1, end: 13 }, { start: 10, end: 20 })).toMatchObject({ start: 10, end: 13 })

	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 11, end: 13 })).toMatchObject({ start: 11, end: 13 })
	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 1, end: 25 })).toMatchObject({ start: 10, end: 20 })

	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 21, end: 25 })).toBeNull()
	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 1, end: null })).toMatchObject({ start: 10, end: 20 })
	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 15, end: null })).toMatchObject({ start: 15, end: 20 })

	expect(getInstanceUnion({ start: 10, end: 20 }, { start: 20, end: null })).toBeNull()

	expect(getInstanceUnion({ start: 50, end: 70 }, { start: 60, end: 60 })).toMatchObject({ start: 60, end: 60 })
})
