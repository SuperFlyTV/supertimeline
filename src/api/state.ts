import { NextEvent, ResolvedTimelineObjectInstance } from './resolvedTimeline'
import { Content } from './timeline'
import { Time } from './types'

/**
 * A TimelineState is a moment in time,
 * containing a cross-section of the timeline,
 * ie all objects that are active at that point in time.
 */
export interface TimelineState<TContent extends Content = Content> {
	/** The timestamp for this state */
	time: Time
	/** All objects that are active on each respective layer */
	layers: StateInTime<TContent>
	/**
	 * A sorted list of the points in time where the next thing will happen on the timeline.
	 * .nextEvents[0] is the next event to happen.
	 */
	nextEvents: NextEvent[]
}
export interface StateInTime<TContent extends Content = Content> {
	[layer: string]: ResolvedTimelineObjectInstance<TContent>
}
