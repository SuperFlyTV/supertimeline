export function literal<T>(o: T): T {
	return o
}

export function compact<T>(arr: (T | undefined | null)[]): T[] {
	const returnValues: T[] = []
	for (let i = 0; i < arr.length; i++) {
		const v = arr[i]
		if (!!v || (v !== undefined && v !== null && v !== '')) returnValues.push(v)
	}
	return returnValues
}
export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1]
}
/** Returns true if argument is an object (or an array, but NOT null) */
export function isObject(o: unknown): o is object {
	return o !== null && typeof o === 'object'
}

export function reduceObj<V, R>(
	objs: { [key: string]: V },
	fcn: (memo: R, value: V, key: string, index: number) => R,
	initialValue: R
): R {
	return Object.entries<V>(objs).reduce((memo, [key, value], index) => {
		return fcn(memo, value, key, index)
	}, initialValue)
}

/** Convenience function, used to ensure that the two arrays are of the same type */
export function pushToArray<T>(arr0: T[], arr1: T[]): void {
	for (const item of arr1) {
		arr0.push(item)
	}
}
export function clone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj))
}
export function uniq<T>(arr: T[]): T[] {
	return Array.from(new Set(arr))
}

type _Omit<V, K extends string> = V extends never
	? any
	: Extract<K, keyof V> extends never
	? Partial<V>
	: Pick<V, Exclude<keyof V, K>>

export function omit<V extends object, K extends string>(obj: V, ...keys: (K | K[])[]): _Omit<V, K> {
	const result: any = {}
	for (const [key, value] of Object.entries<any>(obj)) {
		if (keys.some((k) => (Array.isArray(k) ? k.includes(key as K) : k === key))) continue
		result[key] = value
	}

	return result
}
export function sortBy<T>(arr: T[], fcn: (value: T) => string | number): T[] {
	const sortArray = arr.map((item) => ({ item, value: fcn(item) }))
	sortArray.sort((a, b) => {
		if (a.value < b.value) return -1
		if (a.value > b.value) return 1

		return 0
	})
	return sortArray.map((item) => item.item)
}
export function isEmpty(obj: object): boolean {
	return Object.keys(obj).length === 0
}

export function ensureArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value]
}
export function isArray(arg: object | any[]): arg is any[] {
	// Fast-path optimization: checking for .length is faster than Array.isArray()

	return (arg as any).length !== undefined && Array.isArray(arg)
}
/**
 * Helper function to simply assert that the value is of the type never.
 * Usage: at the end of if/else or switch, to ensure that there is no fallthrough.
 */
export function assertNever(_value: never): void {
	// does nothing
}

export function mapToObject<T>(map: Map<string, T>): { [key: string]: T } {
	const o: { [key: string]: T } = {}
	for (const [key, value] of map.entries()) {
		o[key] = value
	}
	return o
}