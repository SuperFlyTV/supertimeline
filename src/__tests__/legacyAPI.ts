/**
 * This file is only for legacy reasons and only used in our internal testing
 */
import { TriggerType, EventType } from './legacyEnums'
export interface TimelineTrigger {
	type: TriggerType
	value: number | string
}
export interface TimelineObject {
	id: ObjectId
	trigger: TimelineTrigger
	duration?: number | string
	LLayer: string | number
	content: {
		objects?: Array<TimelineObject>

		keyframes?: Array<TimelineKeyframe>
		// templateData?: any,

		[key: string]: any
	}
	classes?: string[]
	disabled?: boolean
	isGroup?: boolean
	repeating?: boolean
	priority?: number
	externalFunction?: string
}
export interface TimelineGroup extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export type TimeMaybe = number | null

export type StartTime = number | null
export type EndTime = number | null
export type Duration = number | null
export type SomeTime = number

export type ObjectId = string

export interface TimelineEvent {
	type: EventType
	time: SomeTime
	obj: TimelineObject
	kf?: TimelineResolvedKeyframe
}
export interface TimelineKeyframe {
	id: string
	trigger: {
		type: TriggerType
		value: number | string
	}
	duration?: number | string
	content?: {
		// templateData?: any,
		[key: string]: any
	}
	classes?: string[]
}
export interface UnresolvedLogicObject {
	prevOnTimeline?: string | boolean | null
	obj: TimelineResolvedObject
}
export interface TimelineResolvedObject extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export interface TimelineResolvedKeyframe extends TimelineKeyframe {
	resolved: ResolvedDetails
	parent?: TimelineResolvedObject
}
export interface ResolvedDetails {
	startTime?: StartTime
	endTime?: EndTime
	innerStartTime?: StartTime
	innerEndTime?: EndTime
	innerDuration?: Duration
	outerDuration?: Duration

	parentStart?: StartTime

	parentId?: ObjectId
	disabled?: boolean

	referredObjectIds?: Array<ResolvedObjectId> | null

	repeatingStartTime?: StartTime

	templateData?: any
	developed?: boolean

	[key: string]: any
}
export interface ResolvedObjectId {
	id: string
	hook: string
}
export interface ResolvedTimeline {
	resolved: Array<TimelineResolvedObject>
	unresolved: Array<TimelineObject>
}
export interface DevelopedTimeline {
	resolved: Array<TimelineResolvedObject>
	unresolved: Array<TimelineObject>
	groups: Array<TimelineGroup>
}

export interface TimelineState {
	time: SomeTime
	GLayers: {
		[GLayer: string]: TimelineResolvedObject
	}
	LLayers: {
		[LLayer: string]: TimelineResolvedObject
	}
}
export interface ExternalFunctions {
	[fcnName: string]: (obj: TimelineResolvedObject, state: TimelineState, tld: DevelopedTimeline) => boolean
}
export type UnresolvedTimeline = Array<TimelineObject>

export interface ResolvedObjectsStore {
	[id: string]: TimelineResolvedObject | TimelineResolvedKeyframe
}
export interface ResolvedObjectTouches {
	[key: string]: number
}

export type Expression = number | string | ExpressionObj
export interface ExpressionObj {
	l: Expression
	o: string
	r: Expression
}
export interface Filter {
	startTime?: StartTime
	endTime?: EndTime
}
export type WhosAskingTrace = string[]
export type objAttributeFunction = (
	objId: string,
	hook: 'start' | 'end' | 'duration' | 'parentStart',
	whosAsking: WhosAskingTrace,
	supressAlreadyAskedWarning?: boolean
) => number | null

// -----------
export interface ResolveOptions {
	/** The base time to use when resolving. Usually you want to input the current time (Date.now()) here. */
	time: SomeTime
	/** Limits the number of repeating objects in the future.
	 * Defaults to 2, which means that the current one and the next will be resolved.
	 */
	limit?: number
}
