import {
	TimelineObject,
	Resolver,
	ResolveOptions
} from '../index'
import * as _ from 'underscore'
import { generateTimeline } from './timelineGenerator'

const startTimer = () => {
	const startTime = process.hrtime()
	return {
		stop: () => {
			const end = process.hrtime(startTime)
			return end[0] + end[1] / 1000000
		}
	}
}

const doPerformanceTest = (useCache: boolean) => {
	let seed = -1

	let executionTimeAvg: number = 0
	let executionTimeCount: number = 0

	const cache = {}

	const stats: {[key: string]: number} = {}

	for (let i = 0; i < 200; i++) {
		seed++

		const timeline: Array<TimelineObject> = generateTimeline(seed, 100, 3)

		const timer = startTimer()
		const options: ResolveOptions = {
			time: 0,
			cache: useCache ? cache : undefined
		}
		// Resolve the timeline
		const resolvedTimeline = Resolver.resolveTimeline(timeline, options)
		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline, options.cache)
		// Calculate the state at a certain time:
		const state0 = Resolver.getState(resolvedStates, 15)

		const time0 = timer.stop()

		expect(resolvedStates).toBeTruthy()
		expect(state0).toBeTruthy()
		expect(time0).toBeLessThan(500)

		// console.log(`Time of execution: ${time0}`)
		if (i > 30) {
			executionTimeAvg += time0
			executionTimeCount++

			stats['seed ' + seed] = time0
		}
	}
	executionTimeAvg /= executionTimeCount

	const sortedTimes = _.sortBy(_.map(stats, (time, key) => {
		return { time, key }
	}), t => t.time)

	return {
		sortedTimes,
		executionTimeAvg
	}

}
const round = (num: number) => {
	return Math.floor(num * 10) / 10
}

describe('performance', () => {
	test('placeholder', () => {
		expect(1 + 1).toEqual(2)
	})
	test('performance test, no cache', () => {

		const {
			sortedTimes,
			executionTimeAvg
		} = doPerformanceTest(false)
		console.log(
			`No Cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
			'Worst 5:\n' + sortedTimes.slice(-5).map(t => `${t.key}: ${round(t.time)} ms`).join('\n'))

		expect(executionTimeAvg).toBeLessThan(50)
	})
	test('performance test, with cache', () => {

		const {
			sortedTimes,
			executionTimeAvg
		} = doPerformanceTest(true)
		console.log(
			`With cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
			'Worst 5:\n' + sortedTimes.slice(-5).map(t => `${t.key}: ${round(t.time)} ms`).join('\n'))

		expect(executionTimeAvg).toBeLessThan(50)
	})
})
