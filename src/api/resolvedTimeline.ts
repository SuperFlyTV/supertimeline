import { Content, TimelineObject } from './timeline'
import { InstanceId, Reference, Time } from './types'

/**
 * The ResolvedTimeline contains all objects on the timeline, resolved.
 * All references and all conflicts have been resolved.
 * The absolute times of all objects can be found in objects[id].resolved.instances.
 *
 * To retrieve a state at a certain time, use getResolvedState(resolvedTimeline, time).
 *
 * Note: If `limitTime` was specified in the ResolveOptions,
 * the ResolvedTimeline is only valid up until that time and
 * needs to be re-resolved afterwards.
 */
export interface ResolvedTimeline<TContent extends Content = Content> {
	/** The options used to resolve the timeline */
	// options: ResolveOptions
	/** Map of all objects on timeline */
	objects: ResolvedTimelineObjects<TContent>
	/** Map of all classes on timeline, maps className to object ids */
	classes: { [className: string]: Array<string> }
	/** Map of the object ids, per layer */
	layers: { [layer: string]: Array<string> }

	// states: AllStates
	nextEvents: Array<NextEvent>

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

		/** How many objects that was actually resolved (is affected when using cache) */
		resolvingCount: number
	}
}
export interface ResolvedTimelineObjects<TContent extends Content = Content> {
	[id: string]: ResolvedTimelineObject<TContent>
}
export interface ResolvedTimelineObject<TContent extends Content = Content> extends TimelineObject<TContent> {
	resolved: {
		/** Instances of the object on the timeline */
		instances: Array<TimelineObjectInstance>
		/** A number that increases the more levels inside of a group the objects is. 0 = no parent */
		levelDeep: number
		/** Id of the parent object (for children in groups or keyframes) */
		parentId: string | undefined
		/** True if object is a keyframe */
		isKeyframe: boolean

		/** Is set to true while object is being resolved (to prevent circular references) */
		resolving: boolean

		/** Is set to true when object is resolved first time, and isn't reset thereafter */
		firstResolved: boolean

		/** Is set to true when object's references has been resolved */
		resolvedReferences: boolean
		/** Is set to true when object's conflicts has been resolved */
		resolvedConflicts: boolean

		/** True if object is referencing itself (only directly, not indirectly via another object) */
		isSelfReferencing: boolean
		/** Ids of all other objects that directly affects this object (ie through direct reference, classes, etc) */
		directReferences: Reference[]
	}
}
export interface InstanceBase {
	/** The start time of the instance */
	start: Time
	/** The end time of the instance (null = infinite) */
	end: Time | null
}
export interface TimelineObjectInstance extends InstanceBase {
	/** id of the instance (unique)  */
	id: InstanceId
	/** if true, the instance starts from the beginning of time */
	isFirst?: boolean

	/** The original start time of the instance (if an instance is split or capped, the original start time is retained in here).
	 * If undefined, fallback to .start
	 */
	originalStart?: Time
	/** The original end time of the instance (if an instance is split or capped, the original end time is retained in here)
	 * If undefined, fallback to .end
	 */
	originalEnd?: Time | null

	/** array of the id of the referenced objects */
	references: Array<Reference>

	/** If set, tells the cap of the parent. The instance will always be capped inside this. */
	caps?: Array<Cap>
	/** If the instance was generated from another instance, reference to the original */
	fromInstanceId?: string
}
export interface Cap {
	id: InstanceId // id of the parent instance
	start: Time
	end: Time | null
}
export interface NextEvent {
	type: EventType
	time: Time
	objId: string
}
export enum EventType {
	START = 0,
	END = 1,
	KEYFRAME = 2,
}

export interface AllStates<TContent extends Content = Content> {
	[layer: string]: {
		[time: string]: ResolvedTimelineObjectInstanceKeyframe<TContent>[] | null
	}
}
export interface ResolvedTimelineObjectInstanceKeyframe<TContent extends Content = Content>
	extends ResolvedTimelineObjectInstance<TContent> {
	isKeyframe?: boolean
}
export interface ResolvedTimelineObjectInstance<TContent extends Content = Content>
	extends ResolvedTimelineObject<TContent> {
	instance: TimelineObjectInstance
}
