import { Duration, Time } from '../api'
import { Cap, TimelineObjectInstance } from '../api/resolvedTimeline'
import { ValueWithReference } from './ReferenceHandler'
import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { addCapsToResuming } from './lib/cap'
import { EventForInstance, sortEvents, InstanceEvent } from './lib/event'
import { isInstanceId } from './lib/instance'
import { last, reduceObj } from './lib/lib'
import { joinReferences, isReference } from './lib/reference'

export class InstanceHandler {
	constructor(private resolvedTimeline: ResolvedTimelineHandler) {}

	public invertInstances(instances: TimelineObjectInstance[]): TimelineObjectInstance[] {
		if (instances.length) {
			instances = this.cleanInstances(instances, true, true)
			const invertedInstances: TimelineObjectInstance[] = []
			if (instances[0].start !== 0) {
				invertedInstances.push({
					id: this.resolvedTimeline.getInstanceId(),
					isFirst: true,
					start: 0,
					end: null,
					references: joinReferences(instances[0].references, `@${instances[0].id}`),
				})
			}
			for (let i = 0; i < instances.length; i++) {
				const instance = instances[i]
				const lastInstance = last(invertedInstances)
				if (lastInstance) {
					lastInstance.end = instance.start
				}
				if (instance.end !== null) {
					invertedInstances.push({
						id: this.resolvedTimeline.getInstanceId(),
						start: instance.end,
						end: null,
						references: joinReferences(instance.references, `@${instance.id}`),
						caps: instance.caps,
					})
				}
			}
			return invertedInstances
		} else {
			return [
				{
					id: this.resolvedTimeline.getInstanceId(),
					isFirst: true,
					start: 0,
					end: null,
					references: [],
				},
			]
		}
	}
	/**
	 * Converts a list of events into a list of instances.
	 * @param events The list of start- and end- events
	 * @param allowMerge If true, will merge instances that overlap into one.
	 * @param allowZeroGaps If true, allows zero-length gaps between instances. If false, will combine the two into one instance.
	 * @param omitOriginalStartEnd Of true, will not keep .originalStart and .originalEnd of the instances
	 */
	public convertEventsToInstances(
		events: EventForInstance[],
		allowMerge: boolean,
		allowZeroGaps = false,
		omitOriginalStartEnd = false
	): TimelineObjectInstance[] {
		sortEvents(events)

		const activeInstances: { [eventId: string]: InstanceEvent } = {}
		let activeInstanceId: string | null = null
		let previousActive = false

		const negativeInstances: { [eventId: string]: InstanceEvent } = {}
		let previousNegative = false
		let negativeInstanceId: string | null = null

		const returnInstances: TimelineObjectInstance[] = []
		for (let i = 0; i < events.length; i++) {
			const event = events[i]
			const eventId: string = event.data.id ?? event.data.instance.id
			const lastInstance = returnInstances[returnInstances.length - 1]

			if (event.value) {
				// Start-event
				activeInstances[eventId] = event
				delete negativeInstances[eventId]
			} else {
				// End-event
				delete activeInstances[eventId]
				negativeInstances[eventId] = event
			}
			if (Object.keys(activeInstances).length) {
				// There is an active instance
				if (!allowMerge && !allowZeroGaps && lastInstance && previousNegative) {
					// There is previously an inActive (negative) instance
					lastInstance.start = event.time
				} else {
					const o = this.handleActiveInstances(
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
						let newInstance: TimelineObjectInstance = o.returnInstance
						if (omitOriginalStartEnd) {
							newInstance = { ...newInstance }
							newInstance.originalStart = undefined
							newInstance.originalEnd = undefined
						}
						returnInstances.push(newInstance)
					}
				}

				previousActive = true
				previousNegative = false
			} else {
				// No instances are active
				if (lastInstance && previousActive) {
					lastInstance.end = event.time
				} else if (Object.keys(negativeInstances).length && !event.data.notANegativeInstance) {
					// There is a negative instance running

					const o = this.handleActiveInstances(
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
						const newInstance: TimelineObjectInstance = {
							...o.returnInstance,
							start: o.returnInstance.end ?? 0,
							end: o.returnInstance.start,
						}
						if (omitOriginalStartEnd) {
							newInstance.originalStart = undefined
							newInstance.originalEnd = undefined
						}
						returnInstances.push(newInstance)
					}
					previousNegative = true
				}

				previousActive = false
			}
		}
		for (const instance of returnInstances) {
			if (instance.end !== null && instance.end < instance.start) {
				// Don't allow negative durations, set it to zero instead:
				instance.end = instance.start
			}
		}
		return returnInstances
	}
	private handleActiveInstances(
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
				id: this.resolvedTimeline.getInstanceId(),
				start: event.time,
				end: null,
				references: event.references,
				originalEnd: event.data.instance.originalEnd,
				originalStart: event.data.instance.originalStart,
			}
			activeInstanceId = eventId
		} else if (!allowMerge && !event.value && lastInstance && activeInstanceId === eventId) {
			// The active instance stopped playing, but another is still playing
			const latestInstance: { event: InstanceEvent; id: string } | null = reduceObj(
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
					id: isInstanceId(eventId)
						? `${eventId}_${this.resolvedTimeline.getInstanceId()}`
						: `@${eventId}_${this.resolvedTimeline.getInstanceId()}`,
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
				id: isInstanceId(eventId) ? eventId : `@${eventId}`,
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
		if (lastInstance?.caps && !lastInstance.caps.length) delete lastInstance.caps

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
	/**
	 * Clean up instances, join overlapping etc..
	 * @param instances
	 */
	public cleanInstances(
		instances: TimelineObjectInstance[],
		allowMerge: boolean,
		allowZeroGaps = false
	): TimelineObjectInstance[] {
		// First, optimize for certain common situations:
		if (instances.length === 0) return []
		if (instances.length === 1) return instances

		const events: EventForInstance[] = []

		for (const instance of instances) {
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
		return this.convertEventsToInstances(events, allowMerge, allowZeroGaps)
	}

	/**
	 * Cap instances so that they are within their parentInstances
	 * @param instances
	 * @param cappingInstances
	 */
	public capInstances(
		instances: TimelineObjectInstance[],
		cappingInstances: ValueWithReference | TimelineObjectInstance[] | null,
		allowZeroGaps = true
	): TimelineObjectInstance[] {
		if (isReference(cappingInstances) || cappingInstances === null) return instances

		let returnInstances: TimelineObjectInstance[] = []
		for (let i = 0; i < instances.length; i++) {
			const instanceOrg: TimelineObjectInstance = instances[i]

			const addedInstanceTimes = new Set<number>()

			for (let j = 0; j < cappingInstances.length; j++) {
				const capInstance = cappingInstances[j]

				// First, check if the instance crosses the parent at all:
				if (
					instanceOrg.start <= (capInstance.end ?? Infinity) &&
					(instanceOrg.end ?? Infinity) >= capInstance.start
				) {
					const instance = this.capInstance(instanceOrg, capInstance)

					if (
						instance.start >= capInstance.start &&
						(instance.end ?? Infinity) <= (capInstance.end ?? Infinity)
					) {
						// The instance is within the parent

						if (instance.start === instance.end && addedInstanceTimes.has(instance.start)) {
							// Don't add zero-length instances if there are already is instances covering that time
						} else {
							instance.references = joinReferences(instance.references, capInstance.references)
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
		for (const instance of returnInstances) {
			// tslint:disable-next-line
			if (ids[instance.id] !== undefined) {
				instance.id = `${instance.id}${++ids[instance.id]}`
			} else {
				ids[instance.id] = 0
			}
		}

		// Clean up the instances, to remove duplicates
		returnInstances = this.cleanInstances(returnInstances, true, allowZeroGaps)

		return returnInstances
	}
	public capInstance(
		instanceOrg: TimelineObjectInstance,
		capInstance: TimelineObjectInstance
	): TimelineObjectInstance {
		const instance: TimelineObjectInstance = { ...instanceOrg }

		// Cap start
		if (instance.start < capInstance.start) {
			this.setInstanceStartTime(instance, capInstance.start)
		}
		// Cap end
		if ((instance.end ?? Infinity) > (capInstance.end ?? Infinity)) {
			this.setInstanceEndTime(instance, capInstance.end)
		}

		return instance
	}
	public setInstanceEndTime(instance: TimelineObjectInstance, endTime: number | null): void {
		instance.originalEnd = instance.originalEnd ?? instance.end
		instance.end = endTime
	}
	public setInstanceStartTime(instance: TimelineObjectInstance, startTime: number): void {
		instance.originalStart = instance.originalStart ?? instance.start
		instance.start = startTime
	}

	public applyRepeatingInstances(
		instances: TimelineObjectInstance[],
		repeatTime0: ValueWithReference | null
	): TimelineObjectInstance[] {
		if (repeatTime0 === null || !repeatTime0.value) return instances

		const options = this.resolvedTimeline.options

		const repeatTime: Duration = repeatTime0.value

		const repeatedInstances: TimelineObjectInstance[] = []
		for (const instance of instances) {
			let startTime = Math.max(options.time - ((options.time - instance.start) % repeatTime), instance.start)
			let endTime: Time | null = instance.end === null ? null : instance.end + (startTime - instance.start)

			const cap: Cap | null =
				(instance.caps
					? instance.caps.find((cap) => instance.references.indexOf(`@${cap.id}`) !== -1)
					: null) ?? null

			const limit = options.limitCount ?? 2
			for (let i = 0; i < limit; i++) {
				if (options.limitTime && startTime >= options.limitTime) break

				const cappedStartTime: Time = cap ? Math.max(cap.start, startTime) : startTime
				const cappedEndTime: Time | null =
					cap && cap.end !== null && endTime !== null ? Math.min(cap.end, endTime) : endTime
				if ((cappedEndTime ?? Infinity) > cappedStartTime) {
					repeatedInstances.push({
						id: this.resolvedTimeline.getInstanceId(),
						start: cappedStartTime,
						end: cappedEndTime,
						references: joinReferences(instance.references, repeatTime0.references, `@${instance.id}`),
					})
				}

				startTime += repeatTime
				if (endTime !== null) endTime += repeatTime
			}
		}
		return this.cleanInstances(repeatedInstances, false)
	}
}
