import { getInstanceIntersection, spliceInstances } from '../instance'

test('getInstanceIntersection', () => {
	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 1, end: 13 })).toMatchObject({ start: 10, end: 13 })
	expect(getInstanceIntersection({ start: 1, end: 13 }, { start: 10, end: 20 })).toMatchObject({ start: 10, end: 13 })

	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 11, end: 13 })).toMatchObject({
		start: 11,
		end: 13,
	})
	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 1, end: 25 })).toMatchObject({ start: 10, end: 20 })

	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 21, end: 25 })).toBeNull()
	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 1, end: null })).toMatchObject({
		start: 10,
		end: 20,
	})
	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 15, end: null })).toMatchObject({
		start: 15,
		end: 20,
	})

	expect(getInstanceIntersection({ start: 10, end: 20 }, { start: 20, end: null })).toBeNull()

	expect(getInstanceIntersection({ start: 50, end: 70 }, { start: 60, end: 60 })).toMatchObject({
		start: 60,
		end: 60,
	})

	expect(getInstanceIntersection({ start: 50, end: null }, { start: 40, end: 70 })).toMatchObject({
		start: 50,
		end: 70,
	})

	expect(getInstanceIntersection({ start: 50, end: null }, { start: 40, end: null })).toMatchObject({
		start: 50,
		end: null,
	})
})

test('spliceInstances', () => {
	const instances = [
		{ start: 10, end: 15 },
		{ start: 20, end: 25 },
		{ start: 30, end: 35 },
		{ start: 40, end: 45 },
		{ start: 50, end: 55 },
	]
	spliceInstances(instances, (i) => {
		if (i.start === 10) return { start: 11, end: 16 }
		if (i.start === 20) return undefined
		if (i.start === 30) return []
		if (i.start === 40)
			return [
				{ start: 41, end: 42 },
				{ start: 45, end: 46 },
			]

		return i
	})
	expect(instances).toEqual([
		{ start: 11, end: 16 },
		// { start: 20, end: 25 },
		// { start: 30, end: 35 },
		{ start: 41, end: 42 },
		{ start: 45, end: 46 },
		{ start: 50, end: 55 },
	])
})
