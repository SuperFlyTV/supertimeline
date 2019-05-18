import * as _ from 'underscore'
import {
	InstanceEvent,
	TimelineObjectInstance,
	ResolveOptions,
	Duration,
	Time,
	ValueWithReference,
	Cap
} from './api/api'

/**
 * Thanks to https://github.com/Microsoft/TypeScript/issues/23126#issuecomment-395929162
 */
export type OptionalPropertyNames<T> = {
	[K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]
export type RequiredPropertyNames<T> = {
	[K in keyof T]-?: undefined extends T[K] ? never : K
}[keyof T]
export type OptionalProperties<T> = Pick<T, OptionalPropertyNames<T>>
export type RequiredProperties<T> = Pick<T, RequiredPropertyNames<T>>

/**
 * Returns the difference between object A and B
 */
type Difference<A, B extends A> = Pick<B, Exclude<keyof B, keyof RequiredProperties<A>>>
/**
 * Somewhat like _.extend, but with strong types & mandated additional properties
 * @param original Object to be extended
 * @param extendObj properties to add
 */
export function extendMandadory<A, B extends A> (original: A, extendObj: Difference<A, B> & Partial<A>): B {
	return _.extend(original, extendObj)
}

export function isConstant (str: string | number | null | any): boolean {
	return !!(
		isNumeric(str) ||
		(
			_.isString(str) &&
			(
				str.match(/^true$/) ||
				str.match(/^false$/)
			)
		)
	)
}
export function isNumeric (str: string | number | null | any): boolean {
	if (str === null) return false
	if (_.isNumber(str)) return true
	if (_.isString(str)) return !!(str.match(/^[0-9\.\-]+$/) && !_.isNaN(parseFloat(str)))
	return false
}
export function sortEvents<T extends InstanceEvent> (events: Array<T>): Array<T> {
	return events.sort((a: InstanceEvent, b: InstanceEvent) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		const aId = a.data && (a.data.id || (a.data.instance && a.data.instance.id))
		const bId = b.data && (b.data.id || (b.data.instance && b.data.instance.id))

		if (aId && bId && aId === bId) {
			// If the event refer to the same ID, let the ending event be first:
			if (a.value && !b.value) return -1
			if (!a.value && b.value) return 1
		}
		if (a.value && !b.value) return 1
		if (!a.value && b.value) return -1

		return 0
	})
}
/**
 * Clean up instances, join overlapping etc..
 * @param instances
 */
export function cleanInstances (
	instances: Array<TimelineObjectInstance>,
	allowMerge: boolean,
	allowZeroGaps: boolean = false
): Array<TimelineObjectInstance> {

	// if (!allowMerge) throw new Error(`TODO: cleanInstances: allowMerge is temorarily removed`)

	const events: Array<EventForInstance> = []

	// let i: number = 1
	_.each(instances, (instance) => {
		// const id = 'i' + (i++)
		events.push({
			time: instance.start,
			value: true,
			data: { instance: instance },
			references: instance.references
		})
		if (instance.end !== null) {
			events.push({
				time: instance.end,
				value: false,
				data: { instance: instance },
				references: instance.references
			})
		}
	})
	return convertEventsToInstances(events, allowMerge, allowZeroGaps)
}
export type EventForInstance = InstanceEvent<{id?: string, instance: TimelineObjectInstance}>
export function convertEventsToInstances (
	events: Array<EventForInstance>,
	allowMerge: boolean,
	allowZeroGaps: boolean = false
): Array<TimelineObjectInstance> {
	sortEvents(events)

	const activeInstances: {[id: string]: InstanceEvent} = {}
	let activeInstanceId: string | null = null
	let previousActive: boolean = false
	const returnInstances: Array<TimelineObjectInstance> = []
	_.each(events, (event) => {
		const eventId = event.data.id || event.data.instance.id
		const lastInstance = _.last(returnInstances)
		if (event.value) {
			activeInstances[eventId] = event
		} else {
			delete activeInstances[eventId]
		}
		if (_.keys(activeInstances).length) {
			// There is an active instance
			previousActive = true
			if (
				!allowMerge &&
				event.value &&
				lastInstance &&
				lastInstance.end === null &&
				activeInstanceId !== null &&
				activeInstanceId !== eventId
			) {
				// Start a new instance:
				lastInstance.end = event.time
				returnInstances.push({
					id: getId(),
					start: event.time,
					end: null,
					references: event.references
				})
				activeInstanceId = eventId
			} else if (
				!allowMerge &&
				!event.value &&
				lastInstance &&
				activeInstanceId === eventId
			) {
				// The active instance stopped playing, but another is still playing
				const latestInstance: {event: InstanceEvent, id: string} | null = _.reduce(
					activeInstances,
					(memo, event, id) => {
						if (
							memo === null ||
							memo.event.time < event.time
						) {
							return {
								event: event,
								id: id
							}
						}
						return memo
					},
					null as ({event: InstanceEvent, id: string} | null)
				)

				if (latestInstance) {
					// Restart that instance now:
					lastInstance.end = event.time
					returnInstances.push({
						id: eventId + '_' + getId(),
						start: event.time,
						end: null,
						references: latestInstance.event.references
					})
					activeInstanceId = latestInstance.id
				}
			} else if (
				allowMerge &&
				!allowZeroGaps &&
				lastInstance &&
				lastInstance.end === event.time
			) {
				// The previously running ended just now
				// resume previous instance:
				lastInstance.end = null
				lastInstance.references = joinReferences(lastInstance.references, event.references)
				lastInstance.caps = joinCaps(lastInstance.caps, event.data.instance.caps)
			} else if (
				!lastInstance ||
				lastInstance.end !== null
			) {
				// There is no previously running instance
				// Start a new instance:
				returnInstances.push({
					id: eventId,
					start: event.time,
					end: null,
					references: event.references,
					caps: event.data.instance.caps
				})
				activeInstanceId = eventId
			} else {
				// There is already a running instance
				lastInstance.references = joinReferences(lastInstance.references, event.references)
				lastInstance.caps = joinCaps(lastInstance.caps, event.data.instance.caps)
			}
			if (lastInstance && lastInstance.caps && !lastInstance.caps.length) delete lastInstance.caps
		} else {
			// No instances are active
			if (
				lastInstance &&
				previousActive
			) {
				lastInstance.end = event.time
			}
			previousActive = false
		}
	})
	return returnInstances
}
export function invertInstances (
	instances: Array<TimelineObjectInstance>
): Array<TimelineObjectInstance> {

	if (instances.length) {
		instances = cleanInstances(instances, true, true)
		const invertedInstances: Array<TimelineObjectInstance> = []
		if (instances[0].start !== 0) {
			invertedInstances.push({
				id: getId(),
				isFirst: true,
				start: 0,
				end: null,
				references: joinReferences(instances[0].references, instances[0].id)
			})
		}
		_.each(instances, (instance) => {
			const last = _.last(invertedInstances)
			if (last) {
				last.end = instance.start
			}
			if (instance.end !== null) {
				invertedInstances.push({
					id: getId(),
					start: instance.end,
					end: null,
					references: joinReferences(instance.references, instance.id),
					caps: instance.caps
				})
			}
		})
		return invertedInstances
	} else {
		return [{
			id: getId(),
			isFirst: true,
			start: 0,
			end: null,
			references: []
		}]
	}
}
/**
 * Perform an action on 2 arrays. Behaves somewhat like the ".*"-operator in Matlab
 * @param array0
 * @param array1
 * @param operate
 */
export function operateOnArrays (
	array0: Array<TimelineObjectInstance> | ValueWithReference | null,
	array1: Array<TimelineObjectInstance> | ValueWithReference | null,
	operate: (a: ValueWithReference | null, b: ValueWithReference | null) => ValueWithReference | null
): Array<TimelineObjectInstance> | ValueWithReference | null {
	if (
		array0 === null ||
		array1 === null
	) return null

	if (
		isReference(array0) &&
		isReference(array1)
	) {
		return operate(array0, array1)
	}

	const result: Array<TimelineObjectInstance> = []

	const minLength = Math.min(
		_.isArray(array0) ? array0.length : Infinity,
		_.isArray(array1) ? array1.length : Infinity
	)
	for (let i = 0; i < minLength; i++) {
		const a: TimelineObjectInstance = (
			_.isArray(array0) ?
			array0[i] :
			{ id: '', start: array0.value, end: array0.value, references: array0.references }
		)
		const b: TimelineObjectInstance = (
			_.isArray(array1) ?
			array1[i] :
			{ id: '', start: array1.value, end: array1.value, references: array1.references }
		)

		const start: ValueWithReference | null = (
			a.isFirst ?
				{ value: a.start, references: a.references } :
			b.isFirst ?
				{ value: b.start, references: b.references } :
			operate(
				{ value: a.start, references: joinReferences(a.id, a.references) },
				{ value: b.start, references: joinReferences(b.id, b.references) }
			)
		)
		const end: ValueWithReference | null = (
			a.isFirst ?
				(a.end !== null ? { value: a.end, references: a.references } : null) :
			b.isFirst ?
				(b.end !== null ? { value: b.end, references: b.references } : null) :
			operate(
				a.end !== null ? { value: a.end, references: joinReferences(a.id, a.references) } : null,
				b.end !== null ? { value: b.end, references: joinReferences(b.id, b.references) } : null
			)
		)

		if (start !== null) {
			result.push({
				id: getId(),
				start: start.value,
				end: end === null ? null : end.value,
				references: joinReferences(start.references, end !== null ? end.references : []),
				caps: joinCaps(a.caps, b.caps)
			})
		}
	}

	return cleanInstances(result, false)
}
/**
 * Like operateOnArrays, but will multiply the number of elements in array0, with the number of elements in array1
 * @param array0
 * @param array1
 * @param operate
 */
/*export function operateOnArraysMulti (
	array0: Array<TimelineObjectInstance> | Reference | null,
	array1: Array<TimelineObjectInstance> | Reference | null,
	operate: (a: Reference | null, b: Reference | null) => Reference | null
) {
	if (array0 === null) return null

	if (_.isArray(array1)) {
		let resultArray: Array<TimelineObjectInstance> = []
		_.each(array1, (array1Val) => {
			const result = operateOnArrays(array0, { value: array1Val.start, references: array1Val.references } , operate)
			if (_.isArray(result)) {
				resultArray = resultArray.concat(result)
			} else if (result !== null) {
				resultArray.push({
					id: getId(),
					start: result.value,
					end: (
						array1Val.end !== null ?
						result.value + (array1Val.end - array1Val.start) :
						null
					),
					references: result.references
				})
			}
		})
		return resultArray
	} else {
		return operateOnArrays(array0, array1, operate)
	}
}
*/
export function applyRepeatingInstances (
	instances: TimelineObjectInstance[],
	repeatTime0: ValueWithReference | null,
	options: ResolveOptions
): TimelineObjectInstance[] {
	if (
		repeatTime0 === null ||
		!repeatTime0.value
	) return instances

	const repeatTime: Duration = repeatTime0.value

	if (isReference(instances)) {
		instances = [{
			id: '',
			start: instances.value,
			end: null,
			references: instances.references
		}]
	}
	const repeatedInstances: TimelineObjectInstance[] = []
	_.each(instances, (instance) => {
		let startTime = Math.max(
			options.time - (options.time - instance.start) % repeatTime,
			instance.start
		)
		let endTime: Time | null = (
			instance.end === null ?
			null :
			instance.end + (startTime - instance.start)
		)

		const cap: Cap | null = (
			instance.caps ?
			_.find(instance.caps, (cap) => instance.references.indexOf(cap.id) !== -1)
			: null
		) || null

		const limit = options.limitCount || 2
		for (let i = 0; i < limit; i++) {
			if (
				options.limitTime &&
				startTime >= options.limitTime
			) break

			const cappedStartTime: Time = (
				cap ?
				Math.max(cap.start, startTime) :
				startTime
			)
			const cappedEndTime: Time | null = (
				cap && cap.end !== null && endTime !== null ?
				Math.min(cap.end, endTime) :
				endTime
			)
			if ((cappedEndTime || Infinity) > cappedStartTime) {
				repeatedInstances.push({
					id: getId(),
					start: cappedStartTime,
					end: cappedEndTime,
					references: joinReferences(instance.id, instance.references, repeatTime0.references)
				})
			}

			startTime += repeatTime
			if (endTime !== null) endTime += repeatTime
		}
	})
	return cleanInstances(repeatedInstances, false)
}
export function capInstances (
	instances: TimelineObjectInstance[],
	parentInstances: ValueWithReference | TimelineObjectInstance[] | null
): TimelineObjectInstance[] {
	if (
		isReference(parentInstances) ||
		parentInstances === null
	) return instances

	const returnInstances: TimelineObjectInstance[] = []
	_.each(instances, (instance) => {

		let parent: TimelineObjectInstance | null = null

		_.each(parentInstances, (p) => {
			if (
				instance.start >= p.start &&
				instance.start < (p.end || Infinity)
			) {
				if (
					parent === null ||
					(p.end || Infinity) > (parent.end || Infinity)
				) {
					parent = p
				}
			}
		})
		if (!parent) {
			_.each(parentInstances, (p) => {
				if (
					(instance.end || Infinity) > p.start &&
					(instance.end || Infinity) <= (p.end || Infinity)
				) {
					if (
						parent === null ||
						(p.end || Infinity) < (parent.end || Infinity)
					) {
						parent = p
					}
				}
			})
		}
		if (parent) {
			const parent2: TimelineObjectInstance = parent // cast type
			const i2 = _.clone(instance)
			if (
				parent2.end !== null &&
				(i2.end || Infinity) > parent2.end
			) {
				i2.end = parent2.end
			}
			if ((i2.start || Infinity) < parent2.start) {
				i2.start = parent2.start
			}

			returnInstances.push(i2)
		}
	})
	return returnInstances
}
export function isReference (ref: any): ref is ValueWithReference {
	return (
		_.isObject(ref) &&
		!_.isArray(ref) &&
		ref.value !== undefined &&
		_.isArray(ref.references) &&
		ref !== null
	)
}
export function joinReferences (...references: Array<Array<string> | string>): Array<string> {
	return _.compact(
		_.uniq(
			_.reduce(references, (memo, ref) => {
				if (_.isString(ref)) return memo.concat([ref])
				else return memo.concat(ref)
			},[] as Array<string>)
		)
	).sort((a, b) => {
		if (a > b) return 1
		if (a < b) return -1
		return 0
	})
}
export function joinCaps (...caps: Array<Array<Cap> | undefined>): Array<Cap> {
	return (
		_.uniq(
			_.compact(
				_.reduce(caps, (memo, cap) => {
					if (cap !== undefined) {
						return (memo || []).concat(cap)
					} else return memo
				},[] as Array<Cap>)
			),
			false,
			(cap) => {
				return cap.id
			}
		)
	)
}
let i: number = 0
/**
 * Returns a unique id
 */
export function getId (): string {
	return '@' + (i++).toString(36)
}
export function resetId (): void {
	i = 0
}
