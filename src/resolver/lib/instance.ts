import { Time, InstanceBase, TimelineObjectInstance } from '../../api'
import { ensureArray } from './lib'

export type InstanceId = `@${string}`

export function isInstanceId(str: string): str is InstanceId {
	return str.startsWith('@')
}

export function instanceIsActive(instance: InstanceBase, time: Time): boolean {
	return instance.start <= time && (instance.end ?? Infinity) > time
}
export function getInstanceUnion(a: InstanceBase, b: InstanceBase): null | InstanceBase {
	if (a.start < (b.end || Infinity) && (a.end || Infinity) > b.start) {
		const start = Math.max(a.start, b.start)
		const end = Math.min(a.end || Infinity, b.end || Infinity)

		return {
			start,
			end: end === Infinity ? null : end,
		}
	}
	return null
}

/**
 * Convenience function to splice an array of instances
 * @param instances The array of instances to splice
 * @param fcn Operator function.
 *   Is called for each instance in the array,
 *   and should return an instance (or an array of instances) to insert in place of the original instance,
 *   or undefined to remove the instance.
 *   (To leave the instance unchanged, return the original instance)
 */
export function spliceInstances(
	instances: TimelineObjectInstance[],
	fcn: (instance: TimelineObjectInstance) => TimelineObjectInstance[] | TimelineObjectInstance | undefined
): void {
	for (let i = 0; i < instances.length; i++) {
		const fcnResult = fcn(instances[i])
		const insertInstances: TimelineObjectInstance[] = fcnResult === undefined ? [] : ensureArray(fcnResult)

		if (insertInstances.length === 0) {
			instances.splice(i, 1)
			i--
		} else {
			if (insertInstances[0] === instances[i]) continue

			// replace:
			instances.splice(i, 1, ...insertInstances)
			i += insertInstances.length - 1
		}
	}
}

export function baseInstances(instances: TimelineObjectInstance[]): InstanceBase[] {
	return instances.map((instance) => baseInstance(instance))
}
export function baseInstance(instance: TimelineObjectInstance): InstanceBase {
	return {
		start: instance.start,
		end: instance.end,
	}
}

export function getInstancesHash(instances: TimelineObjectInstance[]): string {
	const strs: string[] = []
	for (const instance of instances) {
		strs.push(getInstanceHash(instance))
	}
	return strs.join(',')
}
export function getInstanceHash(instance: TimelineObjectInstance): string {
	const orgStart = instance.originalStart ?? instance.start
	const orgEnd = instance.originalEnd ?? instance.end

	return `${instance.start}_${instance.end ?? 'null'}(${orgStart}_${orgEnd ?? 'null'})`
}
