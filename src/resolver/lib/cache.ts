export class Cache {
	private cache = new Map<string, CacheEntry>()

	private clearTimeout: NodeJS.Timer | undefined = undefined
	private timeToCueNewCleanup = false

	constructor(private autoCleanup: boolean = false) {
		if (this.autoCleanup) this.timeToCueNewCleanup = true
	}

	/** Cache the result of function for a limited time */
	public cacheResult<T>(key: string, fcn: () => T, limitTime = 10000): T {
		const cache = this.cache.get(key)
		if (!cache || cache.ttl < Date.now()) {
			const value = fcn()
			this.cache.set(key, {
				ttl: Date.now() + limitTime,
				value: value,
			})

			if (this.timeToCueNewCleanup) {
				this.timeToCueNewCleanup = false
				this.clearTimeout = setTimeout(() => {
					this.clearTimeout = undefined
					this.timeToCueNewCleanup = true
					this.cleanUp()
				}, limitTime + 100)
			}

			return value
		} else {
			return cache.value
		}
	}

	public cleanUp(): void {
		const now = Date.now()
		for (const [key, value] of this.cache.entries()) {
			if (value.ttl < now) this.cache.delete(key)
		}
	}
	public clear(): void {
		this.cache.clear()
		if (this.clearTimeout) {
			clearTimeout(this.clearTimeout)
			this.clearTimeout = undefined
			this.timeToCueNewCleanup = true
		}
	}
}

interface CacheEntry {
	ttl: number
	value: any
}
