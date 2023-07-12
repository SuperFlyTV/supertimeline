import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { EventType, NextEvent, ResolvedTimeline } from '../api/resolvedTimeline'
import { ResolveOptions } from '../api/resolver'
import { Content, TimelineObject } from '../api/timeline'
import { last, literal, mapToObject } from './lib/lib'
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

		// Step 4: Populate nextEvents:
		this.updateNextEvents()

		// Step 5: persist cache
		if (cacheHandler) {
			cacheHandler.persistData()
		}

		const resolvedTimeline = literal<ResolvedTimeline<TContent>>({
			objects: mapToObject(this.resolvedTimeline.objectsMap),
			classes: mapToObject(this.resolvedTimeline.classesMap),
			layers: mapToObject(this.resolvedTimeline.layersMap),
			nextEvents: this.nextEvents,

			statistics: this.resolvedTimeline.getStatistics(),
		})
		toc()
		return resolvedTimeline
	}
	/** Update this.nextEvents */
	private updateNextEvents() {
		const toc = tic('  updateNextEvents')
		this.nextEvents = []

		const allObjects = Array.from(this.resolvedTimeline.objectsMap.values())

		// Sort so keyframes are handled last:
		allObjects.sort((a, b) => {
			if (a.resolved.isKeyframe && !b.resolved.isKeyframe) return 1
			if (!a.resolved.isKeyframe && b.resolved.isKeyframe) return -1
			return 0
		})

		/** Used to fast-track in cases where there are no keyframes */
		const hasKeyframes = last(allObjects)?.resolved.isKeyframe ?? false

		const objectInstanceStartTimes = new Set<string>()
		const objectInstanceEndTimes = new Set<string>()

		for (const obj of allObjects) {
			if (!obj.resolved.isKeyframe) {
				if (!objHasLayer(obj)) continue // transparent objects are omitted in NextEvents
			} else if (obj.resolved.parentId !== undefined) {
				const parentObj = this.resolvedTimeline.getObject(obj.resolved.parentId)
				if (parentObj) {
					/* istanbul ignore if */
					if (!objHasLayer(parentObj)) continue // Keyframes of transparent objects are omitted in NextEvents
				}
			}

			for (const instance of obj.resolved.instances) {
				if (instance.start > this.options.time && instance.start < (this.options.limitTime ?? Infinity)) {
					let useThis = true

					if (hasKeyframes) {
						if (!obj.resolved.isKeyframe) {
							objectInstanceStartTimes.add(`${obj.id}_${instance.start}`)
						} else {
							// No need to put keyframe event if its parent starts at the same time:
							if (objectInstanceStartTimes.has(`${obj.resolved.parentId}_${instance.start}`)) {
								useThis = false
							}
						}
					}

					if (useThis) {
						this.nextEvents.push({
							objId: obj.id,
							type: obj.resolved.isKeyframe ? EventType.KEYFRAME : EventType.START,
							time: instance.start,
						})
					}
				}
				if (
					instance.end !== null &&
					instance.end > this.options.time &&
					instance.end < (this.options.limitTime ?? Infinity)
				) {
					let useThis = true
					if (hasKeyframes) {
						if (!obj.resolved.isKeyframe) {
							objectInstanceEndTimes.add(`${obj.id}_${instance.end}`)
						} else {
							// No need to put keyframe event if its parent ends at the same time:
							if (objectInstanceEndTimes.has(`${obj.resolved.parentId}_${instance.end}`)) {
								useThis = false
							}
						}
					}

					if (useThis) {
						this.nextEvents.push({
							objId: obj.id,
							type: obj.resolved.isKeyframe ? EventType.KEYFRAME : EventType.END,
							time: instance.end,
						})
					}
				}
			}
		}
		this.nextEvents.sort((a, b) => {
			if (a.time < b.time) return -1
			if (a.time > b.time) return 1

			if (a.type < b.type) return 1
			if (a.type > b.type) return -1

			// Fallback, to ensure a deterministic order:
			if (a.objId < b.objId) return -1
			if (a.objId > b.objId) return 1

			return 0
		})
		toc()
	}
}
