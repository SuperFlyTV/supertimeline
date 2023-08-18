import { performance } from 'perf_hooks'
import { generateTimeline } from './timelineGenerator'
import { ResolveOptions, ResolvedTimeline, TimelineObject } from '../api'
import { getResolvedState, resolveTimeline } from '..'
import { sortBy } from '../resolver/lib/lib'
import { activatePerformanceDebugging, setPerformanceTimeFunction } from '../resolver/lib/performance'

export function setupPerformanceTests(activateDebugging: boolean): void {
	activatePerformanceDebugging(activateDebugging)
	// eslint-disable-next-line @typescript-eslint/unbound-method
	setPerformanceTimeFunction(performance.now)
}

const startTimer = () => {
	const startTime = process.hrtime()
	return {
		stop: () => {
			const end = process.hrtime(startTime)
			return end[0] + end[1] / 1000000
		},
	}
}

export const round = (num: number): number => {
	return Math.floor(num * 100) / 100
}

export const doPerformanceTest = (
	testCount: number,
	useCache: boolean
): {
	errorCount: number
	sortedTimes: {
		time: number
		key: string
	}[]
	executionTimeAvg: number
} => {
	let seed = -1

	let executionTimeAvg = 0
	let executionTimeCount = 0
	let errorCount = 0

	const cache = {}

	const stats: { [key: string]: number } = {}

	const testCountMax = testCount * 2

	for (let i = 0; i < testCountMax; i++) {
		if (executionTimeCount >= testCount) break

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

			if (!resolvedTimeline) throw new Error(`resolvedTimeline is falsy`)
			if (!state0) throw new Error(`state0 is falsy`)
			if (!state1) throw new Error(`state1 is falsy`)
			if (!state2) throw new Error(`state2 is falsy`)
			if (!state20) throw new Error(`state20 is falsy`)

			useTest = true
		} catch (e) {
			errorCount++
			if (/circular/.test(`${e}`)) {
				// Unable to resolve timeline due to circular references
				// ignore, we'll just use the next one instead.
			} else {
				throw e
			}
		}

		if (useTest) {
			if (testDuration > 500) throw new Error(`Test took too long (${testDuration}ms)`)
			executionTimeAvg += testDuration
			executionTimeCount++
			stats['seed ' + seed] = testDuration
		}
	}
	executionTimeAvg /= executionTimeCount

	const sortedTimes = sortBy(
		Object.entries<number>(stats).map(([key, time]) => {
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
