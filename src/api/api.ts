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
export interface TimelineObject {
	id: ObjectId
	enable: TimelineEnable

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
export type Content = {
	[key: string]: any
}
export interface TimelineEnable {
	/**
	 * Examples of references:
	 * #objectId
	 * #objectId.start
	 * #objectId.end
	 * #objectId.duration
	 * .className
	 * .className.start + 5
	 * $layerName
	 */

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
	enable: TimelineEnable
	duration?: number | string
	classes?: Array<string>
	content: Content
	disabled?: boolean
}

export interface TimelineObjectKeyframe extends TimelineObject, TimelineKeyframe {
}
export interface ResolvedTimeline {
	/** The options used to resolve the timeline */
	options: ResolveOptions
	/** Map of all objects on timeline */
	objects: ResolvedTimelineObjects
	/** Map of all classes on timeline, maps className to object ids */
	classes: {[className: string]: Array<string>}
	layers: {[layer: string]: Array<string>}
	statistics: {
		/** Number of objects that were unable to resolve */
		unresolvedCount: number
		/** Number of objects that were resolved */
		resolvedCount: number

		/** Number of resolved instances */
		resolvedInstanceCount: number
		/** Number of resolved objects */
		resolvedObjectCount: number
		/** Number of resolved groups */
		resolvedGroupCount: number
		/** Number of resolved keyframes */
		resolvedKeyframeCount: number
	}
}
export interface ResolvedTimelineObjects {
	[id: string]: ResolvedTimelineObject
}
export interface ResolvedTimelineObject extends TimelineObject {
	resolved: {
		/** Is set to true when object has been resolved */
		resolved: boolean
		/** Is set to true while object is resolved (to prevent circular references) */
		resolving: boolean
		/** Instances of the object on the timeline */
		instances: Array<TimelineObjectInstance>
		/** Increases the more levels inside of a group the objects is */
		levelDeep?: number
		/** Id of the parent object */
		parentId?: string
		/** True if object is a keyframe */
		isKeyframe?: boolean
	}
}
export interface TimelineObjectInstance {
	id: string
	isFirst?: boolean // if true, starts from the beginning
	start: Time
	end: Time | null // null = infinite
	references: Array<string> // array of the id of the referenced objects
	caps?: Array<Cap> // If set, tells the cap of the parent
}
export interface Cap {
	id: string // id of the parent
	start: Time
	end: Time | null
}
export interface Reference {
	value: number
	references: Array<string>
}
export interface InstanceEvent<T = any> {
	time: Time
	value: boolean
	references: Array<string>
	data: T
}
export type Expression = number | string | ExpressionObj | null
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
