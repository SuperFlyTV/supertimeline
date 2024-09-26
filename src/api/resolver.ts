import { ResolvedTimelineObjects } from './resolvedTimeline'
import { Content } from './timeline'
import { Time } from './types'

export interface ResolveOptions {
	/**
	 * The base time to use when resolving.
	 * Usually you want to input the current time (Date.now()) here.
	 */
	time: Time
	/**
	 * Limits the number of repeating objects in the future.
	 * Defaults to 2, which means that the current one and the next will be resolved.
	 */
	limitCount?: number
	/**
	 * Limits the repeating objects and nextEvents to a time in the future.
	 * It is recommended to set this to a time in the future at which you plan to re-resolve the timeline again.
	 */
	limitTime?: Time
	/**
	 * An object that is used to persist cache-data between resolves.
	 * If you provide this, ensure that you provide the same object between resolves.
	 * Setting it will increase performance, especially when there are only small changes to the timeline.
	 */
	cache?: Partial<ResolverCache>

	/**
	 * Maximum depth of conflict resolution, per object.
	 * If there are deeper relationships than this, the resolver will throw an error complaining about a circular reference.
	 * Defaults to 5.
	 */
	conflictMaxDepth?: number

	/**
	 * If set to true, will output debug information to the console
	 */
	debug?: boolean

	/**
	 * If true, will store traces of the resolving into resolvedTimeline.statistics.resolveTrace.
	 * This decreases performance slightly.
	 */
	traceResolving?: boolean

	/**
	 * Skip timeline validation.
	 * This improves performance slightly, but will not catch errors in the input timeline so use with caution.
	 */
	skipValidation?: boolean

	/** Skip generating statistics, this improves performance slightly. */
	skipStatistics?: boolean

	/** Don't throw when a timeline-error (such as circular dependency) occurs. The Error will instead be written to resolvedTimeline.error */
	dontThrowOnError?: boolean
}
export interface ResolverCache<TContent extends Content = Content> {
	objHashes: { [id: string]: string }

	objects: ResolvedTimelineObjects<TContent>
	/** Set to true if the data in the cache can be used */
	canBeUsed?: boolean
}
