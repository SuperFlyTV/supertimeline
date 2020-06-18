import {
	TimelineObject,
	Resolver,
	ResolveOptions
} from '../index'
import * as _ from 'underscore'
import { generateTimeline } from './timelineGenerator'

describe('performance', () => {
	test('placeholder', () => {
		expect(1 + 1).toEqual(2)
	})
	test('performance test 1', () => {
		let seed = -1

		let executionTimeAvg: number = 0
		let executionTimeCount: number = 0

		const stats: {[key: string]: number} = {}

		for (let i = 0; i < 100; i++) {
			seed++
			const timeline: Array<TimelineObject> = generateTimeline(seed, 100, 3)

			const startTime = Date.now()
			const options: ResolveOptions = {
				time: 0
			}
			// Resolve the timeline
			const resolvedTimeline = Resolver.resolveTimeline(timeline, options)
			const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)
			// Calculate the state at a certain time:
			const state0 = Resolver.getState(resolvedStates, 15)

			const time0 = Date.now() - startTime

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

		console.log(
			`Average time of execution: ${Math.floor(executionTimeAvg)} ms\n` +
			'Worst 10%:\n' + sortedTimes.slice(-Math.ceil(sortedTimes.length * 0.1)).map(t => `${t.key}: ${Math.floor(t.time)} ms`).join('\n'))

		expect(executionTimeAvg).toBeLessThan(50)
	})
})
