/* eslint-disable jest/no-export, jest/valid-title, jest/expect-expect, jest/no-standalone-expect, jest/no-done-callback */

import { ResolverCache, TimelineObject } from '../api'
import * as Timeline from '..'

interface Test {
	(name: string, fn?: ProvidesCallback, timeout?: number): void

	only: Test
	skip: Test
	todo: Test
	concurrent: Test
}
interface DoneCallback {
	(...args: any[]): any
	fail(error?: string | { message: string }): any
}
type ProvidesCallback = (cb: DoneCallback) => void

// export type Test = (testName: string, cb: (cache: any | undefined) => void | Promise<void>) => void
export type FixTimeline = (timeline: TimelineObject[]) => TimelineObject[]
export type GetCache = () => Partial<ResolverCache> | undefined

function makeTest(setupTest: (test: jest.It, name: string, fn?: ProvidesCallback, timeout?: number) => void): jest.It {
	const testFunction: jest.It = (name, fn, timeout) => setupTest(test, name, fn, timeout)
	testFunction.only = ((name, fn, timeout) => setupTest(test.only, name, fn, timeout)) as jest.It
	testFunction.skip = ((name, fn, timeout) => setupTest(test.skip, name, fn, timeout)) as jest.It
	testFunction.todo = ((name, fn, timeout) => setupTest(test.todo, name, fn, timeout)) as jest.It
	testFunction.concurrent = ((name, fn, timeout) => setupTest(test.concurrent, name, fn, timeout)) as jest.It
	testFunction.failing = ((name, fn, timeout) => setupTest(test.failing, name, fn, timeout)) as jest.It
	testFunction.each = test.each

	return testFunction
}

/** Runs the tests with variations, such as reversing the objects, and with a cache */
export function describeVariants(
	describeName: string,
	setupTests: (test: Test, fixTimeline: FixTimeline, getCache: GetCache) => void,
	options: {
		normal?: boolean
		reversed?: boolean
		cache?: boolean
	}
): void {
	if (options.normal) {
		// First run the tests normally:
		describe(describeName, () => {
			const getCache = literal<GetCache>(() => undefined)
			const fixTimelineNormal = jest.fn((timeline: TimelineObject[]) => timeline)

			const testNormal = makeTest((test, name, fn, timeout) => {
				test(name, fn, timeout)
				afterEach(() => {
					expect(fixTimelineNormal).toHaveBeenCalled()
				})
			})

			setupTests(testNormal, fixTimelineNormal, getCache)
		})
	}

	if (options.reversed) {
		// Run tests with reversed timeline:
		describe(describeName, () => {
			const getCache = literal<GetCache>(() => undefined)
			const fixTimelineReversed = (timeline: TimelineObject[]) => reverseTimeline(timeline)

			const testNormal = makeTest((test, name, fn, timeout) => {
				test(`Reversed: ${name}`, fn, timeout)
			})
			setupTests(testNormal, fixTimelineReversed, getCache)
		})
	}

	if (options.cache) {
		// Run tests with cache:
		describe(describeName, () => {
			const c = {
				cache: {} as Partial<ResolverCache>,
			}
			let reverse = false

			const getCache = jest.fn(literal<GetCache>(() => c.cache))
			const fixTimelineNormal = (timeline: TimelineObject[]) => {
				if (reverse) {
					return reverseTimeline(timeline)
				} else {
					return timeline
				}
			}

			const testWithCaches = makeTest((test, name, fn, timeout) => {
				test(
					`Test cache: ${name}`,
					(...args: any[]) => {
						if (!fn) return

						const cb = args[0] // Note: we can't use the cb parameter directly, because of some jest magic

						// Reset data
						c.cache = {}
						reverse = false
						// First run the test with an empty cache
						const resolved0 = fn(cb)

						// Then run the test again with the previous cache
						const resolved1 = fn(cb)

						// Then reverse the timeline and run with the previous cache
						reverse = true
						const resolved2 = fn(cb)

						expect(resolved0).toEqual(resolved1)
						expect(resolved1).toEqual(resolved2)
					},
					timeout ? timeout * 3 : undefined
				)
				afterEach(() => {
					expect(getCache).toHaveBeenCalled()
				})
			})
			setupTests(testWithCaches, fixTimelineNormal, getCache)
		})
	}
}
describeVariants.only = describe.only
describeVariants.skip = describe.skip

function literal<T>(o: T) {
	return o
}
function reverseTimeline(tl: TimelineObject[]): TimelineObject[] {
	tl.reverse()
	for (const obj of tl) {
		if (obj.children) {
			reverseTimeline(obj.children)
		}
		if (obj.keyframes) {
			obj.keyframes.reverse()
		}
	}

	return tl
}

/** resolveTimeline, with an extra check that the timeline is serializable */
export function resolveTimeline(
	...args: Parameters<typeof Timeline.resolveTimeline>
): ReturnType<typeof Timeline.resolveTimeline> {
	const tl = Timeline.resolveTimeline(...args)
	expect(() => JSON.stringify(tl)).not.toThrow() // test that it's serializable
	return tl
}
/** getResolvedState, with an extra check that the state is serializable */
export function getResolvedState(
	...args: Parameters<typeof Timeline.getResolvedState>
): ReturnType<typeof Timeline.getResolvedState> {
	const state = Timeline.getResolvedState(...args)
	expect(() => JSON.stringify(state)).not.toThrow() // test that it's serializable
	return state
}
