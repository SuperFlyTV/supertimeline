import { EventType } from './enums'

/** Unix timestamp */
export type Time = number
/** Duration */
export type Duration = number

export type TimeMaybe = Time | null
export type DurationMaybe = Duration | null

export type ObjectId = string

export type Times = Array<Time>

export interface ResolveOptions {
	/** The base time to use when resolving. Usually you want to input the current time (Date.now()) here. */
	time: Time
	/** Limits the number of repeating objects in the future.
	 * Defaults to 2, which means that the current one and the next will be resolved.
	 */
	limitCount?: number
	/** Limits the repeating objects to a time in the future */
	limitTime?: Time
}
export interface ResolvedTimeline {
	/** The options used to resolve the timeline */
	options: ResolveOptions
	objects: ResolvedTimelineObjects
	statistics: {
		unresolvedObjectCount: number
		resolvedObjectCount: number
		resolvedInstanceCount: number
		groupCount: number
	}
}
export interface ResolvedTimelineObjects {
	[id: string]: ResolvedTimelineObject
}
export interface ResolvedTimelineObject extends TimelineObject {
	resolved: {
		resolved: boolean
		resolving: boolean
		instances: Array<TimelineObjectInstance>
		parentId?: string
	}
}
export interface TimelineObjectInstance {
	isFirst?: boolean // if true, starts from the beginning
	start: Time
	end: Time | null // null = infinite
}
export interface InstanceEvent<T = any> {
	time: Time
	value: T
}

export interface TimelineObject {
	id: ObjectId
	trigger: TimelineTrigger

	layer: string | number
	/** Group children */
	children?: Array<TimelineObject>
	/** Keyframes can be used to modify the content of an object */
	keyframes?: Array<TimelineKeyframe>
	classes?: Array<string>
	disabled?: boolean
	isGroup?: boolean
	priority?: number
	// externalFunction?: string // TODO: implement hooks
	content: Content
}
type Content = {
	[key: string]: any
}
export interface TimelineTrigger {
	/** (Optional) The start time of the object. (Cannot be combined with .while) */
	start?: Expression
	/** (Optional) The end time of the object (Cannot be combined with .while or .duration) */
	end?: Expression
	/** (Optional) Enables the object WHILE expression is true (ie sets both the start and end). (Cannot be combined with .start, .end or .duration ) */
	while?: Expression
	/** (Optional) The duration of an object */
	duration?: Expression
	/** (Optional) Makes the object repeat with given interval */
	repeating?: Expression
}
export interface TimelineKeyframe {
	id: string
	trigger: TimelineTrigger
	duration?: number | string
	classes?: Array<string>
	content: Content
}

export type Expression = number | string | ExpressionObj
export interface ExpressionObj {
	l: Expression,
	o: string,
	r: Expression
}

export type ExpressionEvent = InstanceEvent<boolean>
export type ResolvedExpression = Array<ExpressionEvent>
export interface ResolvedExpressionObj {
	l: ResolvedExpression,
	o: '+' | '-' | '*' | '/' | '&' | '|' | '!',
	r: ResolvedExpression
}
export interface TimelineState {
	time: Time,
	layers: {
		[layer: string]: ResolvedTimelineObjectInstance
	},
	nextEvents: Array<NextEvent>
}
export interface ResolvedTimelineObjectInstance extends ResolvedTimelineObject {
	instance: TimelineObjectInstance
}
export interface NextEvent {
	type: EventType,
	time: Time,
	objId: string
}
