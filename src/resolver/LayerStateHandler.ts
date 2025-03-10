import { ResolvedTimelineObject, ResolvedTimelineObjectInstance, TimelineObjectInstance } from '../api'
import { InstanceHandler } from './InstanceHandler'
import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { compareStrings } from './lib/lib'
import { tic } from './lib/performance'

/**
 * LayerStateHandler instances are short-lived.
 * They are initialized, .resolveConflicts() is called and then discarded
 */
export class LayerStateHandler {
	private pointsInTime: {
		[time: string]: InstanceAtPointInTime[]
	} = {}

	/** List of object ids on the layer */
	public objectIdsOnLayer: string[]
	/** List of objects on the layer. (this is populated in .resolveConflicts() ) */
	public objectsOnLayer: ResolvedTimelineObject[]

	constructor(
		private resolvedTimeline: ResolvedTimelineHandler,
		private instance: InstanceHandler,
		private layer: string
	) {
		this.objectsOnLayer = []
		this.objectIdsOnLayer = this.resolvedTimeline.getLayerObjects(layer)
	}

	/** Resolve conflicts between objects on the layer. */
	public resolveConflicts(): void {
		const toc = tic('       resolveConflicts')

		/*
			This algoritm basically works like this:

			1. Collect all instances start- and end-times as points-of-interest
			2. Sweep through the points-of-interest and determine which instance is the "winning one" at every point in time
		*/

		// Populate this.objectsOnLayer:
		for (const objId of this.objectIdsOnLayer) {
			this.objectsOnLayer.push(this.resolvedTimeline.getObject(objId))
		}
		if (this.resolvedTimeline.traceResolving)
			this.resolvedTimeline.addResolveTrace(
				`LayerState: Resolve conflicts for layer "${this.layer}", objects: ${this.objectsOnLayer
					.map((o) => o.id)
					.join(', ')}`
			)

		// Fast-path: if there's only one object on the layer, it can't conflict with anything
		if (this.objectsOnLayer.length === 1) {
			for (const obj of this.objectsOnLayer) {
				obj.resolved.resolvedConflicts = true

				for (const instance of obj.resolved.instances) {
					instance.originalStart = instance.originalStart ?? instance.start
					instance.originalEnd = instance.originalEnd ?? instance.end
				}
			}
			return
		}

		// Sort to make sure parent groups are evaluated before their children:
		this.objectsOnLayer.sort(compareObjectsOnLayer)

		// Step 1: Collect all points-of-interest (which points in time we want to evaluate)
		// and which instances that are interesting
		for (const obj of this.objectsOnLayer) {
			// Notes:
			// Since keyframes can't be placed on a layer, we assume that the object is not a keyframe
			// We also assume that the object has a layer

			for (const instance of obj.resolved.instances) {
				const timeEvents: TimeEvent[] = []

				timeEvents.push({ time: instance.start, enable: true })
				if (instance.end) timeEvents.push({ time: instance.end, enable: false })

				// Save a reference to this instance on all points in time that could affect it:
				for (const timeEvent of timeEvents) {
					if (timeEvent.enable) {
						this.addPointInTime(timeEvent.time, 'start', obj, instance)
					} else {
						this.addPointInTime(timeEvent.time, 'end', obj, instance)
					}
				}
			}

			obj.resolved.resolvedConflicts = true
			obj.resolved.instances.splice(0) // clear the instances, so new instances can be re-added later
		}

		// Step 2: Resolve the state for the points-of-interest
		// This is done by sweeping the points-of-interest chronologically,
		// determining the state for every point in time by adding & removing objects from aspiringInstances
		// Then sorting it to determine who takes precedence

		let currentState: ResolvedTimelineObjectInstance | undefined = undefined
		const activeObjIds: { [id: string]: ResolvedTimelineObjectInstance } = {}

		/** The objects in aspiringInstances  */
		let aspiringInstances: AspiringInstance[] = []

		const times: number[] = Object.keys(this.pointsInTime)
			.map((time) => parseFloat(time))
			// Sort chronologically:
			.sort((a, b) => a - b)

		// Iterate through all points-of-interest times:
		for (const time of times) {
			const traceConflicts: string[] = []

			/** A set of identifiers for which instance-events have been check at this point in time. Used to avoid looking at the same object twice. */
			const checkedThisTime = new Set<string>()

			/** List of the instances to check at this point in time. */
			const instancesToCheck: InstanceAtPointInTime[] = this.pointsInTime[time]
			instancesToCheck.sort(this.compareInstancesToCheck)

			for (let j = 0; j < instancesToCheck.length; j++) {
				const o = instancesToCheck[j]
				const obj: ResolvedTimelineObject = o.obj
				const instance: TimelineObjectInstance = o.instance

				let toBeEnabled: boolean
				if (instance.start === time && instance.end === time) {
					// Handle zero-length instances:
					if (o.instanceEvent === 'start') toBeEnabled = true // Start a zero-length instance
					else toBeEnabled = false // End a zero-length instance
				} else {
					toBeEnabled = (instance.start || 0) <= time && (instance.end ?? Infinity) > time
				}

				const identifier = `${obj.id}_${instance.id}_${o.instanceEvent}`
				if (!checkedThisTime.has(identifier)) {
					// Only check each object and event-type once for every point in time
					checkedThisTime.add(identifier)

					if (toBeEnabled) {
						// The instance wants to be enabled (is starting)

						// Add to aspiringInstances:
						aspiringInstances.push({ obj, instance })
					} else {
						// The instance doesn't want to be enabled (is ending)

						// Remove from aspiringInstances:
						aspiringInstances = removeFromAspiringInstances(aspiringInstances, obj.id)
					}

					// Sort the instances on layer to determine who is the active one:
					aspiringInstances.sort(compareAspiringInstances)

					// At this point, the first instance in aspiringInstances is the active one.
					const instanceOnTopOfLayer = aspiringInstances[0]

					// Update current state:
					const prevObjInstance: ResolvedTimelineObjectInstance | undefined = currentState
					const replaceOld: boolean =
						instanceOnTopOfLayer &&
						(!prevObjInstance ||
							prevObjInstance.id !== instanceOnTopOfLayer.obj.id ||
							!prevObjInstance.instance.id.startsWith(`${instanceOnTopOfLayer.instance.id}`))
					const removeOld: boolean = !instanceOnTopOfLayer && prevObjInstance

					if (replaceOld || removeOld) {
						if (prevObjInstance) {
							// Cap the old instance, so it'll end at this point in time:
							this.instance.setInstanceEndTime(prevObjInstance.instance, time)

							// Update activeObjIds:
							delete activeObjIds[prevObjInstance.id]

							if (this.resolvedTimeline.traceResolving) traceConflicts.push(`${prevObjInstance.id} stop`)
						}
					}

					if (replaceOld) {
						// Set the new objectInstance to be the current one:

						const currentObj = instanceOnTopOfLayer.obj

						const newInstance: TimelineObjectInstance = {
							...instanceOnTopOfLayer.instance,
							// We're setting new start & end times so they match up with the state:
							start: time,
							end: null,
							fromInstanceId: instanceOnTopOfLayer.instance.id,

							originalEnd: instanceOnTopOfLayer.instance.originalEnd ?? instanceOnTopOfLayer.instance.end,
							originalStart:
								instanceOnTopOfLayer.instance.originalStart ?? instanceOnTopOfLayer.instance.start,
						}
						// Make the instance id unique:
						for (let i = 0; i < currentObj.resolved.instances.length; i++) {
							if (currentObj.resolved.instances[i].id === newInstance.id) {
								newInstance.id = `${newInstance.id}_$${currentObj.resolved.instances.length}`
							}
						}
						currentObj.resolved.instances.push(newInstance)

						const newObjInstance = {
							...currentObj,
							instance: newInstance,
						}

						// Save to current state:
						currentState = newObjInstance

						// Update activeObjIds:
						activeObjIds[newObjInstance.id] = newObjInstance

						if (this.resolvedTimeline.traceResolving) traceConflicts.push(`${newObjInstance.id} start`)
					} else if (removeOld) {
						// Remove from current state:
						currentState = undefined

						if (this.resolvedTimeline.traceResolving) traceConflicts.push(`-nothing-`)
					}
				}
			}
			if (this.resolvedTimeline.traceResolving)
				this.resolvedTimeline.addResolveTrace(
					`LayerState: Layer "${this.layer}": time: ${time}: ${traceConflicts.join(', ')}`
				)
		}
		// At this point, the instances of all objects are calculated,
		// taking into account priorities, clashes etc.

		// Cap children inside their parents:
		// Functionally, this isn't needed since this is done in ResolvedTimelineHandler.resolveTimelineObj() anyway.
		// However by capping children here some re-evaluating iterations can be avoided, so this increases performance.
		{
			const allChildren = this.objectsOnLayer
				.filter((obj) => !!obj.resolved.parentId)
				// Sort, so that the outermost are handled first:
				.sort((a, b) => {
					return a.resolved.levelDeep - b.resolved.levelDeep
				})

			for (const obj of allChildren) {
				if (obj.resolved.parentId) {
					const parent = this.resolvedTimeline.getObject(obj.resolved.parentId)
					if (parent) {
						obj.resolved.instances = this.instance.cleanInstances(
							this.instance.capInstances(obj.resolved.instances, parent.resolved.instances),
							false,
							false
						)
					}
				}
			}
		}

		toc()
	}
	/** Add an instance and event to a certain point-in-time */
	private addPointInTime(
		time: number,
		instanceEvent: 'start' | 'end',
		obj: ResolvedTimelineObject,
		instance: TimelineObjectInstance
	) {
		// Note on order: Ending events come before starting events

		if (!this.pointsInTime[time + '']) this.pointsInTime[time + ''] = []
		this.pointsInTime[time + ''].push({ obj, instance, instanceEvent })
	}
	private compareInstancesToCheck = (a: InstanceAtPointInTime, b: InstanceAtPointInTime) => {
		// Note: we assume that there are no keyframes here. (if there where, they would be sorted first)

		if (
			a.instance.id === b.instance.id &&
			a.instance.start === b.instance.start &&
			a.instance.end === b.instance.end
		) {
			// A & B are the same instance, it is a zero-length instance!
			// In this case, put the start before the end:
			if (a.instanceEvent === 'start' && b.instanceEvent === 'end') return -1
			if (a.instanceEvent === 'end' && b.instanceEvent === 'start') return 1
		}

		// Handle ending instances first:
		if (a.instanceEvent === 'start' && b.instanceEvent === 'end') return 1
		if (a.instanceEvent === 'end' && b.instanceEvent === 'start') return -1

		if (a.instance.start === a.instance.end || b.instance.start === b.instance.end) {
			// Put later-ending instances last (in the case of zero-length vs non-zero-length instance):
			const difference = (a.instance.end ?? Infinity) - (b.instance.end ?? Infinity)
			if (difference) return difference
		}

		if (a.obj.resolved && b.obj.resolved) {
			// Deeper objects (children in groups) comes later, we want to check the parent groups first:
			const difference = a.obj.resolved.levelDeep - b.obj.resolved.levelDeep
			if (difference) return difference
		}

		// Last resort, sort by id to make it deterministic:
		return compareStrings(a.obj.id, b.obj.id) || compareStrings(a.instance.id, b.instance.id)
	}
}
export interface TimeEvent {
	time: number
	/** true when the event indicate that something starts, false when something ends */
	enable: boolean
}

interface InstanceAtPointInTime {
	obj: ResolvedTimelineObject
	instance: TimelineObjectInstance

	/** The same instanceEvent is only going to be checked once per timestamp */
	instanceEvent: 'start' | 'end'
}
interface AspiringInstance {
	obj: ResolvedTimelineObject
	instance: TimelineObjectInstance
}

function compareObjectsOnLayer(a: ResolvedTimelineObject, b: ResolvedTimelineObject) {
	// Sort to make sure parent groups are evaluated before their children:
	return a.resolved.levelDeep - b.resolved.levelDeep || compareStrings(a.id, b.id)
}

const removeFromAspiringInstances = (aspiringInstances: AspiringInstance[], objId: string): AspiringInstance[] => {
	const returnInstances: AspiringInstance[] = []
	for (let i = 0; i < aspiringInstances.length; i++) {
		if (aspiringInstances[i].obj.id !== objId) returnInstances.push(aspiringInstances[i])
	}
	return returnInstances
}

function compareAspiringInstances(a: AspiringInstance, b: AspiringInstance) {
	// Determine who takes precedence:
	return (
		(b.obj.priority || 0) - (a.obj.priority || 0) || // First, sort using priority
		b.instance.start - a.instance.start || // Then, sort using the start time
		compareStrings(a.obj.id, b.obj.id) || // Last resort, sort by id to make it deterministic
		compareStrings(a.instance.id, b.instance.id)
	)
}
