import { TimelineObject, Resolver, ResolveOptions } from '../index'
import * as _ from 'underscore'
import { generateTimeline } from './timelineGenerator'
import { cleanCacheResult } from '../lib'

const startTimer = () => {
	const startTime = process.hrtime()
	return {
		stop: () => {
			const end = process.hrtime(startTime)
			return end[0] + end[1] / 1000000
		},
	}
}

const doPerformanceTest = (useCache: boolean) => {
	let seed = -1

	let executionTimeAvg = 0
	let executionTimeCount = 0

	const cache = {}

	const stats: { [key: string]: number } = {}

	for (let i = 0; i < TEST_COUNT; i++) {
		seed++

		const timeline: Array<TimelineObject> = generateTimeline(seed, 100, 3)

		const options: ResolveOptions = {
			time: 0,
			cache: useCache ? cache : undefined,
		}

		// Start the timer:
		const timer = startTimer()

		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)
		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline, options.cache)
		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedStates, 15)
		const state1 = Resolver.getState(resolvedStates, 20)
		const state2 = Resolver.getState(resolvedStates, 50)

		// Resolve the timeline again
		const resolvedTimeline2 = Resolver.resolveTimeline(timeline, options)
		const resolvedStates2 = Resolver.resolveAllStates(resolvedTimeline2, options.cache)
		const state20 = Resolver.getState(resolvedStates2, 15)

		// Stop the timer:
		const time0 = timer.stop()

		expect(resolvedStates).toBeTruthy()
		expect(state0).toBeTruthy()
		expect(state1).toBeTruthy()
		expect(state2).toBeTruthy()
		expect(state20).toBeTruthy()
		expect(time0).toBeLessThan(500)

		expect(resolvedStates).toEqual(resolvedStates2)

		cleanCacheResult()

		// console.log(`Time of execution: ${time0}`)

		executionTimeAvg += time0
		executionTimeCount++

		stats['seed ' + seed] = time0
	}
	executionTimeAvg /= executionTimeCount

	const sortedTimes = _.sortBy(
		_.map(stats, (time, key) => {
			return { time, key }
		}),
		(t) => t.time
	)

	return {
		sortedTimes,
		executionTimeAvg,
	}
}
const round = (num: number) => {
	return Math.floor(num * 100) / 100
}
const TEST_COUNT = 500
const TIMEOUT_TIME = 10 * 1000

describe('performance', () => {
	test(
		'performance test, no cache',
		() => {
			const { sortedTimes, executionTimeAvg } = doPerformanceTest(false)
			console.log(
				`No Cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
					'Worst 5:\n' +
					sortedTimes
						.slice(-5)
						.map((t) => `${t.key}: ${round(t.time)} ms`)
						.join('\n')
			)

			expect(executionTimeAvg).toBeLessThan(50)
		},
		TIMEOUT_TIME
	)
	test(
		'performance test, with cache',
		() => {
			const { sortedTimes, executionTimeAvg } = doPerformanceTest(true)
			console.log(
				`With cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
					'Worst 5:\n' +
					sortedTimes
						.slice(-5)
						.map((t) => `${t.key}: ${round(t.time)} ms`)
						.join('\n')
			)

			expect(executionTimeAvg).toBeLessThan(50)
		},
		TIMEOUT_TIME
	)
	afterEach(() => {
		cleanCacheResult()
	})
})
