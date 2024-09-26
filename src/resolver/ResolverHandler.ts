import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { EventType, NextEvent, ResolvedTimeline, ResolvedTimelineObject } from '../api/resolvedTimeline'
import { ResolveOptions } from '../api/resolver'
import { Content, TimelineObject } from '../api/timeline'
import { compareStrings, literal, mapToObject } from './lib/lib'
import { tic } from './lib/performance'
import { CacheHandler } from './CacheHandler'
import { objHasLayer } from './lib/timeline'
import { TimelineValidator } from './TimelineValidator'

/**
 * Note: A Resolver instance is short-lived and used to resolve a timeline.
 * Intended usage:
 * 1. const resolver = new Resolver(options)
 * 2. resolver.run(timeline)
 */
export class ResolverHandler<TContent extends Content = Content> {
	private hasRun = false

	private nextEvents: NextEvent[] = []

	private resolvedTimeline: ResolvedTimelineHandler<TContent>

	private validator: TimelineValidator

	constructor(private options: ResolveOptions) {
		const toc = tic('new Resolver')
		this.resolvedTimeline = new ResolvedTimelineHandler<TContent>(this.options)
		this.validator = new TimelineValidator()
		toc()
	}
	/**
	 * Resolves a timeline, i.e. resolves the references between objects
	 * This method can only be run once per Resolver instance.
	 */
	public resolveTimeline(timeline: TimelineObject<TContent>[]): ResolvedTimeline<TContent> {
		const toc = tic('resolveTimeline')
		/* istanbul ignore if */
		if (this.hasRun)
			throw new Error(
				`Resolver.resolveTimeline can only run once per instance!
Usage:
const resolver = new Resolver(options);
resolver.run(timeline);`
			)
		this.hasRun = true

		// Step 0: Validate the timeline:
		if (!this.options.skipValidation) {
			this.validator.validateTimeline(timeline, false)
		}

		// Step 1: Populate ResolvedTimeline with the timeline:
		for (const obj of timeline) {
			this.resolvedTimeline.addTimelineObject(obj)
		}

		// Step 2: Use cache:
		let cacheHandler: CacheHandler | undefined
		if (this.options.cache) {
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
	}
}
