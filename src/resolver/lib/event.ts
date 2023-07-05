import { Time, TimelineObjectInstance } from '../../api'
import { Reference } from './reference'

export interface InstanceEvent<T = any> {
	time: Time
	value: boolean
	references: Reference[]
	data: T
}
export type EventForInstance = InstanceEvent<{
	id?: string
	instance: TimelineObjectInstance
	notANegativeInstance?: boolean
}>

export function sortEvents<T extends InstanceEvent>(
	events: Array<T>,
	additionalSortFcnBefore?: (a: T, b: T) => number
): Array<T> {
	return events.sort((a: T, b: T) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		const result = additionalSortFcnBefore ? additionalSortFcnBefore(a, b) : 0
		if (result !== 0) return result

		const aId = a.data && (a.data.id || a.data.instance?.id)
		const bId = b.data && (b.data.id || b.data.instance?.id)
		if (aId && bId && aId === bId) {
			// If the events refer to the same instance id, let the start event be first,
			// to handle zero-length instances.
			if (a.value && !b.value) return -1
			if (!a.value && b.value) return 1
		} else {
			// ends events first:
			if (a.value && !b.value) return 1
			if (!a.value && b.value) return -1
		}
		return 0
	})
}
