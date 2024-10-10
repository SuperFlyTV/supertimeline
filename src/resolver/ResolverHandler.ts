import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { ResolvedTimeline } from '../api/resolvedTimeline'
import { ResolveOptions } from '../api/resolver'
import { Content, TimelineObject } from '../api/timeline'
import { tic } from './lib/performance'
import { CacheHandler } from './CacheHandler'
import { TimelineValidator } from './TimelineValidator'
import { ResolveError } from './lib/Error'

/**
 * Note: A Resolver instance is short-lived and used to resolve a timeline.
 * Intended usage:
 * 1. const resolver = new Resolver(options)
 * 2. resolver.run(timeline)
 */
export class ResolverHandler<TContent extends Content = Content> {
	private hasRun = false

	private resolvedTimeline: ResolvedTimelineHandler<TContent>

	private validator: TimelineValidator

	constructor(private options: ResolveOptions) {
		const toc = tic('new Resolver')
		this.resolvedTimeline = new ResolvedTimelineHandler<TContent>(this.options)
		this.validator = new TimelineValidator()
		if (this.options.traceResolving) {
			this.resolvedTimeline.addResolveTrace(`init`)
		}
		toc()
	}
	/**
	 * Resolves a timeline, i.e. resolves the references between objects
	 * This method can only be run once per Resolver instance.
	 */
	public resolveTimeline(timeline: TimelineObject<TContent>[]): ResolvedTimeline<TContent> {
		try {
			const toc = tic('resolveTimeline')
			/* istanbul ignore if */
			if (this.hasRun) {
				if (this.options.traceResolving) this.resolvedTimeline.addResolveTrace(`Error: has already run`)
				throw new Error(
					`Resolver.resolveTimeline can only run once per instance!
	Usage:
	const resolver = new Resolver(options);
	resolver.run(timeline);`
				)
			}
			this.hasRun = true

			if (this.options.traceResolving) {
				this.resolvedTimeline.addResolveTrace(`resolveTimeline start`)
				this.resolvedTimeline.addResolveTrace(`timeline object count ${timeline.length}`)
			}

			// Step 0: Validate the timeline:
			if (!this.options.skipValidation) {
				this.validator.validateTimeline(timeline, false)
			}

			// Step 1: Populate ResolvedTimeline with the timeline:
			for (const obj of timeline) {
				this.resolvedTimeline.addTimelineObject(obj)
			}
			if (this.options.traceResolving) {
				this.resolvedTimeline.addResolveTrace(`objects: ${this.resolvedTimeline.objectsMap.size}`)
			}

			// Step 2: Use cache:
			let cacheHandler: CacheHandler | undefined
			if (this.options.cache) {
				if (this.options.traceResolving) this.resolvedTimeline.addResolveTrace(`using cache`)

				cacheHandler = this.resolvedTimeline.initializeCache(this.options.cache)

				cacheHandler.determineChangedObjects()
			}

			// Step 3: Go through and resolve all objects:
			this.resolvedTimeline.resolveAllTimelineObjs()

			// Step 5: persist cache
			if (cacheHandler) {
				cacheHandler.persistData()
			}

			if (this.options.traceResolving) this.resolvedTimeline.addResolveTrace(`resolveTimeline done!`)

			const resolvedTimeline: ResolvedTimeline<TContent> = this.resolvedTimeline.getResolvedTimeline()

			toc()
			return resolvedTimeline
		} catch (e) {
			if (this.options.cache) {
				// Reset cache, since it might be corrupt.
				CacheHandler.resetCache(this.options.cache)
			}

			throw new ResolveError(e, this.resolvedTimeline.getResolvedTimeline())
		}
	}
}
