import * as _ from 'underscore'
import {
	InstanceEvent,
	TimelineObjectInstance,
	ResolveOptions,
	Duration,
	Time,
	ValueWithReference,
	Cap,
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

export function isConstant(str: string | number | null | any): str is string | number {
	return !!(
		isNumeric(str) ||
		(typeof str === 'string' && (str.toLowerCase() === 'true' || str.toLowerCase() === 'false'))
	)
}
export function isNumeric(str: string | number | null | any): boolean {
	if (str === null) return false
	if (typeof str === 'number') return true
	if (typeof str === 'string') return !!(str.match(/^[-+]?[0-9.]+$/) && !isNaN(parseFloat(str)))
	return false
}
export function sortEvents<T extends InstanceEvent>(events: Array<T>): Array<T> {
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
export function cleanInstances(
	instances: Array<TimelineObjectInstance>,
	allowMerge: boolean,
	allowZeroGaps = false
): Array<TimelineObjectInstance> {
	// First, optimize for certain common situations:
	if (instances.length === 0) return []
	if (instances.length === 1) return instances

	const events: Array<EventForInstance> = []

	for (let i = 0; i < instances.length; i++) {
		const instance = instances[i]

		events.push({
			time: instance.start,
			value: true,
			data: { instance: instance },
			references: instance.references,
		})
		if (instance.end !== null) {
			events.push({
				time: instance.end,
				value: false,
				data: { instance: instance },
				references: instance.references,
			})
		}
	}
	return convertEventsToInstances(events, allowMerge, allowZeroGaps)
}
export type EventForInstance = InstanceEvent<{ id?: string; instance: TimelineObjectInstance }>
export function convertEventsToInstances(
	events: Array<EventForInstance>,
	allowMerge: boolean,
	allowZeroGaps = false
): Array<TimelineObjectInstance> {
	sortEvents(events)

	const activeInstances: { [id: string]: InstanceEvent } = {}
	let activeInstanceId: string | null = null
	let previousActive = false

	const negativeInstances: { [id: string]: InstanceEvent } = {}
	let previousNegative = false
	let negativeInstanceId: string | null = null

	const returnInstances: Array<TimelineObjectInstance> = []
	for (let i = 0; i < events.length; i++) {
		const event = events[i]
		const eventId = event.data.id || event.data.instance.id
		const lastInstance = returnInstances[returnInstances.length - 1]
		if (event.value) {
			activeInstances[eventId] = event
			delete negativeInstances[eventId]
		} else {
			delete activeInstances[eventId]
			negativeInstances[eventId] = event
		}
		if (Object.keys(activeInstances).length) {
			// There is an active instance
			if (!allowMerge && !allowZeroGaps && lastInstance && previousNegative) {
				// There is previously an inActive (negative) instance
				lastInstance.start = event.time
			} else {
				const o = handleActiveInstances(
					event,
					lastInstance,
					activeInstanceId,
					eventId,
					activeInstances,
					allowMerge,
					allowZeroGaps
				)
				activeInstanceId = o.activeInstanceId
				if (o.returnInstance) {
					returnInstances.push(o.returnInstance)
				}
			}

			previousActive = true
			previousNegative = false
		} else {
			// No instances are active
			if (lastInstance && previousActive) {
				lastInstance.end = event.time
			} else {
				if (Object.keys(negativeInstances).length) {
					// There is a negative instance running

					const o = handleActiveInstances(
						event,
						lastInstance,
						negativeInstanceId,
						eventId,
						negativeInstances,
						allowMerge,
						allowZeroGaps
					)
					negativeInstanceId = o.activeInstanceId
					if (o.returnInstance) {
						returnInstances.push({
							...o.returnInstance,
							start: o.returnInstance.end || 0,
							end: o.returnInstance.start,
						})
					}
					previousNegative = true
				}
			}
			previousActive = false
		}
	}
	return returnInstances
}
function handleActiveInstances(
	event: EventForInstance,
	lastInstance: TimelineObjectInstance,
	activeInstanceId: string | null,
	eventId: string,
	activeInstances: { [id: string]: InstanceEvent<any> },

	allowMerge: boolean,
	allowZeroGaps = false
): {
	activeInstanceId: string | null
	returnInstance: TimelineObjectInstance | null
} {
	let returnInstance: TimelineObjectInstance | null = null
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
		returnInstance = {
			id: getId(),
			start: event.time,
			end: null,
			references: event.references,
			originalEnd: event.data.instance.originalEnd,
			originalStart: event.data.instance.originalStart,
		}
		activeInstanceId = eventId
	} else if (!allowMerge && !event.value && lastInstance && activeInstanceId === eventId) {
		// The active instance stopped playing, but another is still playing
		const latestInstance: { event: InstanceEvent; id: string } | null = _.reduce(
			activeInstances,
			(memo, instanceEvent, id) => {
				if (memo === null || memo.event.time < instanceEvent.time) {
					return {
						event: instanceEvent,
						id: id,
					}
				}
				return memo
			},
			null as { event: InstanceEvent; id: string } | null
		)

		if (latestInstance) {
			// Restart that instance now:
			lastInstance.end = event.time
			returnInstance = {
				id: eventId + '_' + getId(),
				start: event.time,
				end: null,
				references: latestInstance.event.references,
				originalEnd: event.data.instance.originalEnd,
				originalStart: event.data.instance.originalStart,
			}
			activeInstanceId = latestInstance.id
		}
	} else if (allowMerge && !allowZeroGaps && lastInstance && lastInstance.end === event.time) {
		// The previously running ended just now
		// resume previous instance:
		lastInstance.end = null
		lastInstance.references = joinReferences(lastInstance.references, event.references)
		addCapsToResuming(lastInstance, event.data.instance.caps)
	} else if (!lastInstance || lastInstance.end !== null) {
		// There is no previously running instance
		// Start a new instance:
		returnInstance = {
			id: eventId,
			start: event.time,
			end: null,
			references: event.references,
			caps: event.data.instance.caps,
			originalEnd: event.data.instance.originalEnd,
			originalStart: event.data.instance.originalStart,
		}
		activeInstanceId = eventId
	} else {
		// There is already a running instance
		lastInstance.references = joinReferences(lastInstance.references, event.references)
		addCapsToResuming(lastInstance, event.data.instance.caps)
	}
	if (lastInstance && lastInstance.caps && !lastInstance.caps.length) delete lastInstance.caps

	if (
		returnInstance &&
		lastInstance &&
		lastInstance.start === lastInstance.end &&
		lastInstance.end === returnInstance.start
	) {
		// replace the previous zero-length with this one instead
		lastInstance.id = returnInstance.id
		lastInstance.start = returnInstance.start
		lastInstance.end = returnInstance.end
		lastInstance.references = returnInstance.references
		lastInstance.caps = returnInstance.caps
		lastInstance.originalStart = returnInstance.originalStart
		lastInstance.originalEnd = returnInstance.originalEnd

		returnInstance = null
	}

	return {
		activeInstanceId,
		returnInstance,
	}
}
export function invertInstances(instances: Array<TimelineObjectInstance>): Array<TimelineObjectInstance> {
	if (instances.length) {
		instances = cleanInstances(instances, true, true)
		const invertedInstances: Array<TimelineObjectInstance> = []
		if (instances[0].start !== 0) {
			invertedInstances.push({
				id: getId(),
				isFirst: true,
				start: 0,
				end: null,
				references: joinReferences(instances[0].references, instances[0].id),
			})
		}
		for (let i = 0; i < instances.length; i++) {
			const instance = instances[i]
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
					caps: instance.caps,
				})
			}
		}
		return invertedInstances
	} else {
		return [
			{
				id: getId(),
				isFirst: true,
				start: 0,
				end: null,
				references: [],
			},
		]
	}
}
/**
 * Perform an action on 2 arrays. Behaves somewhat like the ".*"-operator in Matlab
 * @param array0
 * @param array1
 * @param operate
 */
export function operateOnArrays(
	array0: Array<TimelineObjectInstance> | ValueWithReference | null,
	array1: Array<TimelineObjectInstance> | ValueWithReference | null,
	operate: (a: ValueWithReference | null, b: ValueWithReference | null) => ValueWithReference | null
): Array<TimelineObjectInstance> | ValueWithReference | null {
	if (array0 === null || array1 === null) return null

	if (isReference(array0) && isReference(array1)) {
		return operate(array0, array1)
	}

	const result: Array<TimelineObjectInstance> = []

	const minLength = Math.min(
		Array.isArray(array0) ? array0.length : Infinity,
		Array.isArray(array1) ? array1.length : Infinity
	)
	for (let i = 0; i < minLength; i++) {
		const a: TimelineObjectInstance = Array.isArray(array0)
			? array0[i]
			: { id: '', start: array0.value, end: array0.value, references: array0.references }
		const b: TimelineObjectInstance = Array.isArray(array1)
			? array1[i]
			: { id: '', start: array1.value, end: array1.value, references: array1.references }

		const start: ValueWithReference | null = a.isFirst
			? { value: a.start, references: a.references }
			: b.isFirst
			? { value: b.start, references: b.references }
			: operate(
					{ value: a.start, references: joinReferences(a.id, a.references) },
					{ value: b.start, references: joinReferences(b.id, b.references) }
			  )
		const end: ValueWithReference | null = a.isFirst
			? a.end !== null
				? { value: a.end, references: a.references }
				: null
			: b.isFirst
			? b.end !== null
				? { value: b.end, references: b.references }
				: null
			: operate(
					a.end !== null ? { value: a.end, references: joinReferences(a.id, a.references) } : null,
					b.end !== null ? { value: b.end, references: joinReferences(b.id, b.references) } : null
			  )

		if (start !== null) {
			result.push({
				id: getId(),
				start: start.value,
				end: end === null ? null : end.value,
				references: joinReferences(start.references, end !== null ? end.references : []),
				caps: joinCaps(a.caps, b.caps),
			})
		}
	}

	return cleanInstances(result, false)
}
export function applyRepeatingInstances(
	instances: TimelineObjectInstance[],
	repeatTime0: ValueWithReference | null,
	options: ResolveOptions
): TimelineObjectInstance[] {
	if (repeatTime0 === null || !repeatTime0.value) return instances

	const repeatTime: Duration = repeatTime0.value

	if (isReference(instances)) {
		instances = [
			{
				id: '',
				start: instances.value,
				end: null,
				references: instances.references,
			},
		]
	}
	const repeatedInstances: TimelineObjectInstance[] = []
	for (let i = 0; i < instances.length; i++) {
		const instance = instances[i]

		let startTime = Math.max(options.time - ((options.time - instance.start) % repeatTime), instance.start)
		let endTime: Time | null = instance.end === null ? null : instance.end + (startTime - instance.start)

		const cap: Cap | null =
			(instance.caps ? _.find(instance.caps, (cap) => instance.references.indexOf(cap.id) !== -1) : null) || null

		const limit = options.limitCount || 2
		for (let i = 0; i < limit; i++) {
			if (options.limitTime && startTime >= options.limitTime) break

			const cappedStartTime: Time = cap ? Math.max(cap.start, startTime) : startTime
			const cappedEndTime: Time | null =
				cap && cap.end !== null && endTime !== null ? Math.min(cap.end, endTime) : endTime
			if ((cappedEndTime ?? Infinity) > cappedStartTime) {
				repeatedInstances.push({
					id: getId(),
					start: cappedStartTime,
					end: cappedEndTime,
					references: joinReferences(instance.id, instance.references, repeatTime0.references),
				})
			}

			startTime += repeatTime
			if (endTime !== null) endTime += repeatTime
		}
	}
	return cleanInstances(repeatedInstances, false)
}
/**
 * Cap instances so that they are within their parentInstances
 * @param instances
 * @param parentInstances
 */
export function capInstances(
	instances: TimelineObjectInstance[],
	parentInstances: ValueWithReference | TimelineObjectInstance[] | null
): TimelineObjectInstance[] {
	if (isReference(parentInstances) || parentInstances === null) return instances

	let returnInstances: TimelineObjectInstance[] = []
	for (let i = 0; i < instances.length; i++) {
		const instanceOrg: TimelineObjectInstance = instances[i]

		const addedInstanceTimes = new Set<number>()

		for (let j = 0; j < parentInstances.length; j++) {
			const parent = parentInstances[j]

			// First, check if the instance crosses the parent at all:
			if (instanceOrg.start <= (parent.end ?? Infinity) && (instanceOrg.end ?? Infinity) >= parent.start) {
				const instance: TimelineObjectInstance = { ...instanceOrg }

				// Cap start
				if (instance.start < parent.start) {
					setInstanceStartTime(instance, parent.start)
				}
				// Cap end
				if ((instance.end ?? Infinity) > (parent.end ?? Infinity)) {
					setInstanceEndTime(instance, parent.end)
				}

				if (instance.start >= parent.start && (instance.end ?? Infinity) <= (parent.end ?? Infinity)) {
					// The instance is within the parent

					if (instance.start === instance.end && addedInstanceTimes.has(instance.start)) {
						// Don't add zero-length instances if there are already is instances covering that time
					} else {
						instance.references = joinReferences(instance.references, parent.references)
						returnInstances.push(instance)

						addedInstanceTimes.add(instance.start)
						if (instance.end) addedInstanceTimes.add(instance.end)
					}
				}
			}
		}
	}

	returnInstances.sort((a, b) => a.start - b.start)

	// Ensure unique ids:
	const ids: { [id: string]: number } = {}
	for (let i = 0; i < returnInstances.length; i++) {
		const instance = returnInstances[i]

		// tslint:disable-next-line
		if (ids[instance.id] !== undefined) {
			instance.id = instance.id + ++ids[instance.id]
		} else {
			ids[instance.id] = 0
		}
	}

	// Clean up the instances, to remove duplicates
	returnInstances = cleanInstances(returnInstances, true, true)

	return returnInstances
}
export function isReference(ref0: unknown): ref0 is ValueWithReference {
	const ref = ref0 as ValueWithReference
	return (
		typeof ref === 'object' &&
		!Array.isArray(ref) &&
		ref.value !== undefined &&
		Array.isArray(ref.references) &&
		ref !== null
	)
}
export function joinReferences(...references: Array<Array<string> | string>): Array<string> {
	const refMap: { [reference: string]: true } = {}
	const refs: string[] = []

	for (let i = 0; i < references.length; i++) {
		const reference = references[i]
		if (reference) {
			if (typeof reference === 'string') {
				if (!refMap[reference]) refs.push(reference)
				refMap[reference] = true
			} else {
				for (let j = 0; j < reference.length; j++) {
					const ref = reference[j]
					if (ref) {
						if (!refMap[ref]) refs.push(ref)
						refMap[ref] = true
					}
				}
			}
		}
	}
	return refs.sort((a, b) => {
		if (a > b) return 1
		if (a < b) return -1
		return 0
	})
}
export function addCapsToResuming(instance: TimelineObjectInstance, ...caps: Array<Array<Cap> | undefined>): void {
	const capsToAdd: Cap[] = []
	const joinedCaps = joinCaps(...caps)
	for (let i = 0; i < joinedCaps.length; i++) {
		const cap = joinedCaps[i]

		if (cap.end !== null && instance.end !== null && cap.end > instance.end) {
			capsToAdd.push({
				id: cap.id,
				start: 0,
				end: cap.end,
			})
		}
	}
	instance.caps = joinCaps(instance.caps, capsToAdd)
}
export function joinCaps(...caps: Array<Array<Cap> | undefined>): Array<Cap> {
	const capMap: { [capReference: string]: Cap } = {}
	for (let i = 0; i < caps.length; i++) {
		const caps2 = caps[i]
		if (caps2) {
			for (let j = 0; j < caps2.length; j++) {
				const cap2 = caps2[j]
				capMap[cap2.id] = cap2
			}
		}
	}
	return Object.values(capMap)
}
let idCount = 0
/**
 * Returns a unique id
 */
export function getId(): string {
	return '@' + (idCount++).toString(36)
}
export function resetId(): void {
	idCount = 0
}
export function setInstanceEndTime(instance: TimelineObjectInstance, endTime: number | null): void {
	instance.originalEnd = instance.originalEnd !== undefined ? instance.originalEnd : instance.end
	instance.end = endTime
}
export function setInstanceStartTime(instance: TimelineObjectInstance, startTime: number): void {
	instance.originalStart = instance.originalStart !== undefined ? instance.originalStart : instance.start
	instance.start = startTime
}
export function applyParentInstances(
	parentInstances: TimelineObjectInstance[] | null,
	value: TimelineObjectInstance[] | null | ValueWithReference
): TimelineObjectInstance[] | null | ValueWithReference {
	return operateOnArrays(parentInstances, value, operate)
}
function operate(a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null {
	if (a === null || b === null) return null
	return {
		value: a.value + b.value,
		references: joinReferences(a.references, b.references),
	}
}

const cacheResultCache: {
	[name: string]: {
		ttl: number
		value: any
	}
} = {}
let cleanCacheResultTimeout: NodeJS.Timeout | null = null
/** Cache the result of function for a limited time */
export function cacheResult<T>(name: string, fcn: () => T, limitTime = 1000): T {
	if (Math.random() < 0.01) {
		if (cleanCacheResultTimeout) clearTimeout(cleanCacheResultTimeout)
		cleanCacheResultTimeout = setTimeout(() => {
			cleanCacheResult()
		}, 100)
	}
	const cache = cacheResultCache[name]
	if (!cache || cache.ttl < Date.now()) {
		const value = fcn()
		cacheResultCache[name] = {
			ttl: Date.now() + limitTime,
			value: value,
		}
		return value
	} else {
		return cache.value
	}
}
export function cleanCacheResult(): void {
	if (cleanCacheResultTimeout) {
		clearTimeout(cleanCacheResultTimeout)
		cleanCacheResultTimeout = null
	}
	_.each(cacheResultCache, (cache, name) => {
		if (cache.ttl < Date.now()) delete cacheResultCache[name]
	})
}
