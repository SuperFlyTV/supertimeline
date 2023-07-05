import { ResolvedTimelineObjects } from './resolvedTimeline'
import { Time } from './types'

export interface ResolveOptions {
	/** The base time to use when resolving. Usually you want to input the current time (Date.now()) here. */
	time: Time
	/** Limits the number of repeating objects in the future.
	 * Defaults to 2, which means that the current one and the next will be resolved.
	 */
	limitCount?: number
	/** Limits the repeating objects to a time in the future */
	limitTime?: Time
	/** If set to true, the resolver will go through the instances of the objects and fix collisions, so that the instances more closely resembles the end state. */
	resolveInstanceCollisions?: boolean
	/** A cache that is to persist data between resolves. If provided, will increase performance of resolving when only making small changes to the timeline. */
	cache?: Partial<ResolverCache>

	/** Maximum depth of conflict resolution, per object. Defaults to 3 */
	conflictMaxDepth?: number

	/** If set to true, will output debug information to the console */
	debug?: boolean
}
export interface ResolverCache {
	objHashes: { [id: string]: string }

	objects: ResolvedTimelineObjects
	hasOldData?: boolean

	// resolvedStates?: ResolvedStates
}
