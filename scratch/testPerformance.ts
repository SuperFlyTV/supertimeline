import { doPerformanceTest, round } from '../src/__tests__/performance'
import * as readline from 'readline'

/********************************************
 * This file is intened to be used to test the performance while having the debugger attached.
 * To run:
 * node --inspect -r ts-node/register scratch\testPerformance.ts
 ********************************************/

const TEST_COUNT = 1000

async function askQuestion(query: string) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise((resolve) =>
		rl.question(query, (ans: any) => {
			rl.close()
			resolve(ans)
		})
	)
}

;(async () => {
	await askQuestion('Press enter to start test')

	const { sortedTimes, executionTimeAvg } = doPerformanceTest(TEST_COUNT, false)

	console.log(
		`Average time of execution: ${round(executionTimeAvg)} ms\n` +
			'Worst 5:\n' +
			sortedTimes
				.slice(-5)
				.map((t) => `${t.key}: ${round(t.time)} ms`)
				.join('\n')
	)
})().catch((e) => {
	console.error(e)
	// eslint-disable-next-line no-process-exit
	process.exit(1)
})
