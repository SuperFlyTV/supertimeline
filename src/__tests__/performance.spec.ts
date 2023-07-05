import { generateTimeline } from './timelineGenerator'
import { ResolveOptions, ResolvedTimeline, TimelineObject } from '../api'
import { getResolvedState, resolveTimeline } from '..'
import { sortBy } from '../resolver/lib/lib'
import { activatePerformanceDebugging, ticTocPrint } from '../resolver/lib/performance'

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
	let errorCount = 0

	const cache = {}

	const stats: { [key: string]: number } = {}

	const testCountMax = TEST_COUNT * 2

	for (let i = 0; i < testCountMax; i++) {
		if (executionTimeCount >= TEST_COUNT) break

		seed++

		const timeline: Array<TimelineObject> = generateTimeline(seed, 100, 3)

		const options: ResolveOptions = {
			time: 0,
			cache: useCache ? cache : undefined,
		}

		// Start the timer:

		let resolvedTimeline: ResolvedTimeline | undefined = undefined
		let useTest = false
		let testDuration = 0
		try {
			const timer = startTimer()
			// Resolve the timeline
			resolvedTimeline = resolveTimeline(timeline, options)
			// Calculate the state at a certain time:
			const state0 = getResolvedState(resolvedTimeline, 15)
			const state1 = getResolvedState(resolvedTimeline, 20)
			const state2 = getResolvedState(resolvedTimeline, 50)

			// Resolve the timeline again
			const resolvedTimeline2 = resolveTimeline(timeline, options)
			const state20 = getResolvedState(resolvedTimeline2, 15)

			// Stop the timer:
			testDuration = timer.stop()

			expect(resolvedTimeline).toBeTruthy()
			expect(state0).toBeTruthy()
			expect(state1).toBeTruthy()
			expect(state2).toBeTruthy()
			expect(state20).toBeTruthy()

			// expect(omit(resolvedTimeline, 'statistics')).toStrictEqual(omit(resolvedTimeline2, 'statistics'))

			useTest = true
		} catch (e) {
			errorCount++
			if (`${e}`.match(/circular/)) {
				// Unable to resolve timeline due to circular references
				// console.log(timeline)
				// console.log('circular')
				// ignore
			} else {
				throw e
			}
		}

		// console.log(`Time of execution: ${testDuration}`)

		if (useTest) {
			expect(testDuration).toBeLessThan(500)
			executionTimeAvg += testDuration
			executionTimeCount++
			stats['seed ' + seed] = testDuration
		}
	}
	executionTimeAvg /= executionTimeCount

	const sortedTimes = sortBy(
		Object.entries(stats).map(([key, time]) => {
			return { time, key }
		}),
		(t) => t.time
	)

	return {
		errorCount,
		sortedTimes,
		executionTimeAvg,
	}
}
const round = (num: number) => {
	return Math.floor(num * 100) / 100
}
const TEST_COUNT = 500
const TIMEOUT_TIME = 10 * 1000

beforeAll(() => {
	activatePerformanceDebugging(false) // set to true to enable performance debugging
})
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
			ticTocPrint()
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
			ticTocPrint()
		},
		TIMEOUT_TIME
	)
})
