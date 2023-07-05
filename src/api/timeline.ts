import { Expression } from './expression'
import { ObjectId } from './types'

export interface TimelineObject {
	id: ObjectId
	enable: TimelineEnable | TimelineEnable[]

	layer: string | number
	/** Group children */
	children?: Array<TimelineObject>
	/** Keyframes can be used to modify the content of an object */
	keyframes?: Array<TimelineKeyframe>
	classes?: Array<string>
	disabled?: boolean
	isGroup?: boolean
	/** Priority, defaults to 0 */
	priority?: number
	/** If set to true, colliding timeline-instances will be merged into one */
	seamless?: boolean
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
	enable: TimelineEnable | TimelineEnable[]
	duration?: number | string
	classes?: Array<string>
	content: Content
	disabled?: boolean
}
