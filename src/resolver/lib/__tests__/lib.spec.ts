import {
	literal,
	compact,
	last,
	isObject,
	reduceObj,
	pushToArray,
	clone,
	uniq,
	omit,
	sortBy,
	isEmpty,
	ensureArray,
	isArray,
} from '../lib'

test('literal', () => {
	expect(literal('x')).toBe('x')
})
test('compact', () => {
	expect(compact([0, 1, 2, 3, 4, '', null, undefined, '1234'])).toStrictEqual([0, 1, 2, 3, 4, '1234'])
})
test('last', () => {
	expect(last([1, 2, 3, 4])).toBe(4)
})
test('isObject', () => {
	expect(isObject({ a: 1 })).toBe(true)
	expect(isObject(null)).toBe(false)
	expect(isObject([])).toBe(true)
})
test('reduceObj', () => {
	expect(reduceObj({ a: 1, b: 2, c: 3 }, (memo, value, key) => memo + value + key, 'start')).toBe('start1a2b3c')
})
test('pushToArray', () => {
	const a = [1, 2]
	pushToArray(a, [3, 4])
	expect(a).toStrictEqual([1, 2, 3, 4])
})
test('clone', () => {
	expect(clone({ a: 1 })).toStrictEqual({ a: 1 })
})
test('uniq', () => {
	expect(uniq([1, 2, 3, 1])).toStrictEqual([1, 2, 3])
})
test('omit', () => {
	expect(omit({ a: 1, b: 2 }, 'a')).toStrictEqual({ b: 2 })
})
test('sortBy', () => {
	expect(
		sortBy(
			[
				{ a: 1, b: 2 },
				{ a: 2, b: 1 },
			],
			(o) => o.b
		)
	).toStrictEqual([
		{ b: 1, a: 2 },
		{ b: 2, a: 1 },
	])
})
test('isEmpty', () => {
	expect(isEmpty({})).toBe(true)
	expect(isEmpty({ a: 1 })).toBe(false)
})
test('ensureArray', () => {
	expect(ensureArray({ a: 1 })).toStrictEqual([{ a: 1 }])
	expect(ensureArray([{ a: 1 }])).toStrictEqual([{ a: 1 }])
})
test('isArray', () => {
	expect(isArray({ a: 1 })).toEqual(false)
	expect(isArray([{ a: 1 }])).toEqual(true)
})
