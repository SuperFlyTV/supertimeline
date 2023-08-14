import { TimelineObject } from '../api'

/** Returns a timeline, to be used in tests */
export function generateTimeline(seed: number, maxCount: number, maxGroupDepth: number): TimelineObject[] {
	const random = new Random(seed)

	const timeline: TimelineObject[] = []

	const ref: Array<Array<TimelineObject>> = [timeline]

	const layers: string[] = []
	const layerCount = Math.ceil(random.get() * maxCount * 0.3)
	for (let i = 0; i < layerCount; i++) {
		layers.push('layer' + random.getInt(10000))
	}
	const objectIds: string[] = []

	let count = 0
	while (count < maxCount) {
		count++

		const refObj = objectIds[random.getInt(objectIds.length)]
		const enable: TimelineObject['enable'] =
			!refObj || random.get() < 0.25
				? { start: `${random.getInt(1000)}` }
				: random.get() < 0.25
				? { start: `#${objectIds}` }
				: random.get() < 0.33
				? { start: `#${objectIds} + ${random.getInt(100)}` }
				: random.get() < 0.5
				? { while: `#${objectIds} + ${random.getInt(100)}` }
				: { while: `#${objectIds}` }
		if (random.get() < 0.1) {
			enable.repeating = random.getInt(400)
		}

		const obj: TimelineObject = {
			id: 'aaaaa' + count,
			content: {},
			enable: enable,
			layer: layers[random.getInt(layers.length)],
		}
		const collection: TimelineObject[] = ref[ref.length - 1]

		if (random.get() > 0.2 && ref.length < maxGroupDepth) {
			// Create a new group and continue in it
			obj.isGroup = true
			obj.children = []
			ref.push(obj.children)
		} else if (ref.length > 1 && random.get() < 0.2) {
			// go out of the group
			ref.pop()
		} else {
			// nothing
		}
		collection.push(obj)
	}
	return timeline
}

// Park-Miller-Carta Pseudo-Random Number Generator, https://gist.github.com/blixt/f17b47c62508be59987b
class Random {
	private _seed: number
	constructor(seed: number) {
		this._seed = seed % 2147483647
		if (this._seed <= 0) this._seed += 2147483646
	}
	/**
	 * Returns a pseudo-random value between 1 and 2^32 - 2.
	 */
	private next() {
		return (this._seed = (this._seed * 16807) % 2147483647)
	}
	/**
	 * Returns a pseudo-random floating point number in range [0, 1).
	 */
	get() {
		// We know that result of next() will be 1 to 2147483646 (inclusive).
		return (this.next() - 1) / 2147483646
	}
	getInt(max: number) {
		return Math.floor(this.get() * max)
	}
}
