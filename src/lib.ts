import * as _ from 'underscore'
import {
	InstanceEvent,
	TimelineObjectInstance,
	ResolveOptions,
	Duration,
	Time
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

		if (a.value && !b.value) return -1
		if (!a.value && b.value) return 1
		return 0
	})
}
/**
 * Clean up instances, join overlapping etc..
 * @param instances
 */
export function cleanInstances (instances: Array<TimelineObjectInstance>, allowMerge: boolean): Array<TimelineObjectInstance> {

	if (allowMerge) {
		const events: Array<InstanceEvent<{id: string, value: boolean}>> = []

		let i: number = 1
		_.each(instances, (instance) => {
			const id = 'i' + (i++)
			events.push({
				time: instance.start,
				value: { id: id, value: true }
			})
			if (instance.end !== null) {
				events.push({
					time: instance.end,
					value: { id: id, value: false }
				})
			}
		})
		sortEvents(events)

		const activeInstances: {[id: string]: true} = {}
		const returnInstances: Array<TimelineObjectInstance> = []
		_.each(events, (event) => {
			if (event.value.value) {
				activeInstances[event.value.id] = true
			} else {
				delete activeInstances[event.value.id]
			}
			const lastInstance = _.last(returnInstances)
			if (_.keys(activeInstances).length) {
				if (
					lastInstance &&
					lastInstance.end === event.time
				) {
					lastInstance.end = null
				} else if (
					!lastInstance ||
					lastInstance.end !== null
				) {
					returnInstances.push({
						start: event.time,
						end: null
					})
				}
			} else {
				if (lastInstance) {
					lastInstance.end = event.time
				}
			}
		})
		return returnInstances
	} else {

		instances.sort((a, b) => {
			if (a.start > b.start) return 1
			if (a.start < b.start) return -1

			return 0
		})
		const returnInstances: Array<TimelineObjectInstance> = []
		let previousInstance: TimelineObjectInstance | null = null
		_.each(instances, (instance) => {
			let skip: boolean = false
			if (previousInstance !== null) {
				if (
					previousInstance.end !== null &&
					previousInstance.end > instance.start &&
					previousInstance.start < instance.start &&
					previousInstance.end < (instance.end || Infinity)
				) {
					previousInstance.end = instance.start
				}

				if (
					previousInstance.start === instance.start
				) {

					if ((previousInstance.end || Infinity) < (instance.end || Infinity)) {
						returnInstances.splice(returnInstances.length - 1, 1)
					} else {
						skip = true
					}
				}
			}
			if (!skip) {
				returnInstances.push(instance)
				previousInstance = instance
			}
		})
		return returnInstances
	}

}
export function invertInstances (instances: Array<TimelineObjectInstance>): Array<TimelineObjectInstance> {

	if (instances.length) {
		instances = cleanInstances(instances, true)
		const invertedInstances: Array<TimelineObjectInstance> = []
		if (instances[0].start !== 0) {
			invertedInstances.push({
				isFirst: true,
				start: 0,
				end: null
			})
		}
		_.each(instances, (instance) => {
			const last = _.last(invertedInstances)
			if (last) {
				last.end = instance.start
			}
			if (instance.end !== null) {
				invertedInstances.push({
					start: instance.end,
					end: null
				})
			}
		})
		return _.compact(_.map(invertedInstances, (instance) => {
			if (instance.end === instance.start) return null
			return instance
		}))
	} else {
		return [{
			isFirst: true,
			start: 0,
			end: null
		}]
	}
}
export function operateOnArrays (
	array0: Array<TimelineObjectInstance> | number | null,
	array1: Array<TimelineObjectInstance> | number | null,
	operate: (a: number | null, b: number | null) => number | null
): Array<TimelineObjectInstance> | number | null {
	if (
		array0 === null ||
		array1 === null
	) return null

	if (
		_.isNumber(array0) &&
		_.isNumber(array1)
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
			{ start: array0, end: array0 }
		)
		const b: TimelineObjectInstance = (
			_.isArray(array1) ?
			array1[i] :
			{ start: array1, end: array1 }
		)
		const start = (
			a.isFirst ?
				a.start :
			b.isFirst ?
				b.start :
			operate(a.start, b.start)
		)
		const end = (
			a.isFirst ?
				a.end :
			b.isFirst ?
				b.end :
			operate(a.end, b.end)
		)
		if (start !== null) {
			result.push({
				start: start,
				end: end
			})
		}
	}
	return cleanInstances(result, false)
}
export function applyRepeatingInstances (
	instances: number | TimelineObjectInstance[] | null,
	repeatTime0: number | null,
	options: ResolveOptions
): number | TimelineObjectInstance[] | null {
	if (
		repeatTime0 === null ||
		instances === null ||
		!repeatTime0
	) return instances

	const repeatTime: Duration = repeatTime0

	if (_.isNumber(instances)) {
		instances = [{
			start: instances,
			end: null
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

		const limit = options.limitCount || 2
		for (let i = 0; i < limit; i++) {
			if (
				!options.limitTime ||
				startTime < options.limitTime
			) {
				repeatedInstances.push({
					start: startTime,
					end: endTime
				})
			} else {
				break
			}

			startTime += repeatTime
			if (endTime !== null) endTime += repeatTime
		}
	})
	return cleanInstances(repeatedInstances, false)
}
export function capInstances (instances: TimelineObjectInstance[], parentInstances: number | TimelineObjectInstance[] | null): TimelineObjectInstance[] {
	if (
		_.isNumber(parentInstances) ||
		parentInstances === null
	) return instances

	const returnInstances: TimelineObjectInstance[] = []
	_.each(instances, (instance) => {

		// @ts-ignore
		let parent: TimelineObjectInstance = null

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
		if (parent) {
			const i2 = _.clone(instance)
			if (
				parent.end !== null &&
				(i2.end || Infinity) > parent.end
			) {
				i2.end = parent.end
			}
			returnInstances.push(i2)
		}
	})
	return returnInstances
}
