import { Expression } from './expression'
import { ObjectId } from './types'

export interface TimelineObject<TContent extends Content = Content> {
	/** ID of the object. Must be unique! */
	id: ObjectId

	/** Expression (or array of expressions) defining when the Timeline-object will play */
	enable: TimelineEnable | TimelineEnable[]

	/**
	 * The layer where the object is played.
	 * If set to undefined, "" or null, the object is treated as "transparent",
	 * ie it won't collide with other objects, nor be present in the resolved state.
	 * */
	layer: string | number

	/**
	 * Children object of the group.
	 * If provided, also set .isGroup property to true.
	 */
	children?: TimelineObject<Content>[]
	isGroup?: boolean

	/**
	 * Keyframes can be used to modify the content of an object.
	 * When a keyframe is active, the content of the keyframe will be merged into the parent object.
	 */
	keyframes?: TimelineKeyframe<Partial<TContent>>[]

	/**
	 * A list of classes on this Timeline-object. classes can be referenced by other objects using the syntax: ".className"
	 */
	classes?: Array<string>

	/** If set to true, the object will be excluded when resolving the timeline. */
	disabled?: boolean

	/**
	 * Priority. Affects which object "wins" when there are two colliding objects on the same layer.
	 * If the two colliding objects have the same priority, the one which started playing last wins.
	 * Otherwise, the one with the highest priority wins (ie 9 wins over 0).
	 * Defaults to 0
	 */
	priority?: number

	/**
	 * If set to true, colliding timeline-instances will be merged into a single one.
	 * This could be useful if want the instance.start times to not be reset unexpectedly.
	 */
	seamless?: boolean

	/** The payload of the timeline-object. Can be anything you want. */
	content: TContent
}
export type Content = {
	[key: string]: any
}
export interface TimelineEnable {
	/**
	 * Examples of Expressions:
	 * "#objectId"
	 * "#objectId.start"
	 * "#objectId.end"
	 * "#objectId.duration"
	 * ".className"
	 * ".className.start + 5"
	 * "$layerName"
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
export interface TimelineKeyframe<TContent extends Content = Content> {
	/**
	 * ID of the Timeline-object.
	 * Must be unique (timeline-objects are also considered)!
	 */
	id: ObjectId

	/**
	 * Expression (or array of expressions) defining when the Timeline-object will play.
	 * If this is an absolute value, it is counted as relative to the parent object.
	 */
	enable: TimelineEnable | TimelineEnable[]

	/**
	 * A list of classes on this Timeline-object. classes can be referenced by other objects using the syntax: ".className"
	 */
	classes?: Array<string>

	/** If set to true, the object will be excluded when resolving the timeline. */
	disabled?: boolean

	/**
	 * The payload of the timeline-object.
	 * This is deeply extended onto the parent object when the keyframe is active.
	 */
	content: TContent
}
