import { performance } from 'perf_hooks'

let durations: { [name: string]: number } = {}
let callCounts: { [name: string]: number } = {}

let firstStartTime = 0

let active = false
export function activatePerformanceDebugging(activate: boolean): void {
	active = activate
}

function noop(): void {
	// nothing
}
/**
 * Used to measure performance.
 * Starts a measurement, returns a function that should be called when the measurement is done.
 */
export function tic(id: string): () => void {
	if (!active) return noop
	if (!firstStartTime) firstStartTime = performance.now()

	if (!durations[id]) durations[id] = 0
	if (!callCounts[id]) callCounts[id] = 0
	const startTime = performance.now()

	return () => {
		const duration = performance.now() - startTime

		durations[id] = durations[id] + duration
		callCounts[id]++
	}
}

export function ticTocPrint(): void {
	if (!active) return
	const totalDuration = performance.now() - firstStartTime

	const maxKeyLength = Math.max(...Object.keys(durations).map((k) => k.length))

	console.log(
		'ticTocPrint\n' +
			padStr(`Total duration `, maxKeyLength + 2) +
			`${Math.floor(totalDuration)}\n` +
			Object.entries<number>(durations)
				.map((d) => {
					let str = padStr(`${d[0]} `, maxKeyLength + 2)

					str += padStr(`${Math.floor(d[1] * 10) / 10}`, 8)

					str += padStr(`${Math.floor((d[1] / totalDuration) * 1000) / 10}%`, 7)

					str += `${callCounts[d[0]]}`

					return str
				})
				.join('\n')
	)

	durations = {}
	callCounts = {}
}

function padStr(str: string, length: number): string {
	while (str.length < length) str += ' '
	return str
}
