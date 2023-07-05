import { NextEvent, ResolvedTimelineObjectInstance } from './resolvedTimeline'
import { Time } from './types'

export interface TimelineState {
	time: Time
	layers: StateInTime
	nextEvents: NextEvent[]
}
export interface StateInTime {
	[layer: string]: ResolvedTimelineObjectInstance
}
