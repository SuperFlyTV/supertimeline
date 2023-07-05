import { InstanceId } from '../resolver/lib/instance'
import { Reference } from '../resolver/lib/reference'
import { TimelineObject } from './timeline'
import { Time, TimeMaybe } from './types'

export interface ResolvedTimeline {
	/** The options used to resolve the timeline */
	// options: ResolveOptions
	/** Map of all objects on timeline */
	objects: ResolvedTimelineObjects
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
export interface ResolvedTimelineObjects {
	[id: string]: ResolvedTimelineObject
}
export interface ResolvedTimelineObject extends TimelineObject {
	resolved: {
		/** Instances of the object on the timeline */
		instances: Array<TimelineObjectInstance>
		/** Increases the more levels inside of a group the objects is */
		levelDeep?: number
		/** Id of the parent object (for children in groups or keyframes) */
		parentId?: string
		/** True if object is a keyframe */
		isKeyframe?: boolean

		/** Is set to true while object is resolved (to prevent circular references) */
		resolving: boolean

		/** Is set to true when object is resolved first time, and isn't reset thereafter */
		firstResolved: boolean

		/** Is set to true when object's references has been resolved */
		resolvedReferences: boolean
		/** Is set to true when object has been capped in its parent */
		resolvedParentCap: boolean
		/** Is set to true when object's conflicts has been resolved */
		resolvedConflicts: boolean

		/** True if object is referencing itself (only directly, not indirectly via another object) */
		isSelfReferencing?: boolean
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

export interface AllStates {
	[layer: string]: {
		[time: string]: ResolvedTimelineObjectInstanceKeyframe[] | null
	}
}
export interface ResolvedTimelineObjectInstanceKeyframe extends ResolvedTimelineObjectInstance {
	isKeyframe?: boolean
	keyframeEndTime?: TimeMaybe
}
export interface ResolvedTimelineObjectInstance extends ResolvedTimelineObject {
	instance: TimelineObjectInstance
}
