import { activatePerformanceDebugging, ticTocPrint } from '../resolver/lib/performance'
import { doPerformanceTest, round } from './performance'

const TIMEOUT_TIME = 10 * 1000
const TEST_COUNT = 500

beforeAll(() => {
	activatePerformanceDebugging(false) // set to true to enable performance debugging
})
describe('performance', () => {
	test(
		'performance test, no cache',
		() => {
			const { sortedTimes, executionTimeAvg } = doPerformanceTest(TEST_COUNT, false)
			console.log(
				`No Cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
					'Worst 5:\n' +
					sortedTimes
						.slice(-5)
						.map((t) => `${t.key}: ${round(t.time)} ms`)
						.join('\n')
			)

			expect(executionTimeAvg).toBeLessThan(30) // it's ~15ms in GH actions
			ticTocPrint()
		},
		TIMEOUT_TIME
	)
	test(
		'performance test, with cache',
		() => {
			const { sortedTimes, executionTimeAvg } = doPerformanceTest(TEST_COUNT, true)
			console.log(
				`With cache: Average time of execution: ${round(executionTimeAvg)} ms\n` +
					'Worst 5:\n' +
					sortedTimes
						.slice(-5)
						.map((t) => `${t.key}: ${round(t.time)} ms`)
						.join('\n')
			)

			expect(executionTimeAvg).toBeLessThan(20) // it's ~10ms in GH actions
			ticTocPrint()
		},
		TIMEOUT_TIME
	)
})
