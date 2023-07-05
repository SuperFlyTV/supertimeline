import { ResolvedTimelineObjects } from './resolvedTimeline'
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
	 * It is recommended set this to a time in the future at which point you plan to re-resolve the timeline again.
	 */
	limitTime?: Time
	/**
	 * An object that is used to persist cache-data between resolves.
	 * If you provide this, ensure that you provide the same object between resolves.
	 * When set, will increase performance, especially when there are only small changes to the timeline.
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
	 * Skip timeline validation.
	 * This improves performance slightly, but will not catch errors in the input timeline so use with caution.
	 */
	skipValidation?: boolean
}
export interface ResolverCache {
	objHashes: { [id: string]: string }

	objects: ResolvedTimelineObjects
	hasOldData?: boolean

	// resolvedStates?: ResolvedStates
}
