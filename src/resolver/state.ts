import {
	TimelineState,
	ResolvedTimeline,
	Time,
	ResolvedTimelineObject,
	TimelineObjectInstance,
	ResolvedTimelineObjectInstance,
	Content,
	AllStates,
	StateInTime,
	TimeEvent,
	ResolvedStates,
	ResolvedTimelineObjectInstanceKeyframe,
	NextEvent,
	ResolverCache,
} from '../api/api'
import * as _ from 'underscore'
import { addObjectToResolvedTimeline } from './common'
import { EventType } from '../api/enums'
import { capInstances, cleanInstances, setInstanceEndTime } from '../lib'

export function getState(resolved: ResolvedTimeline | ResolvedStates, time: Time, eventLimit = 0): TimelineState {
	const resolvedStates: ResolvedStates = isResolvedStates(resolved) ? resolved : resolveStates(resolved)

	const state: TimelineState = {
		time: time,
		layers: {},
		nextEvents: resolvedStates.nextEvents.filter((e) => e.time > time),
	}
	if (eventLimit) state.nextEvents = state.nextEvents.slice(0, eventLimit)

	const layerKeys = Object.keys(resolvedStates.layers)
	for (let i = 0; i < layerKeys.length; i++) {
		const layer = layerKeys[i]

		const o = getStateAtTime(resolvedStates.state, layer, time)
		if (o) state.layers[layer] = o
	}

	return state
}
export function resolveStates(resolved: ResolvedTimeline, cache?: ResolverCache): ResolvedStates {
	const resolvedStates: ResolvedStates = {
		options: resolved.options,
		statistics: resolved.statistics,

		// These will be re-created during the state-resolving:
		objects: {},
		classes: {},
		layers: {},

		state: {},
		nextEvents: [],
	}

	if (cache && resolved.statistics.resolvingCount === 0 && cache.resolvedStates) {
		// Nothing has changed since last time, just return the states right away:
		return cache.resolvedStates
	}

	const resolvedObjects = Object.values(resolved.objects)
	// Sort to make sure parent groups are evaluated before their children:
	resolvedObjects.sort((a, b) => {
		if ((a.resolved.levelDeep || 0) > (b.resolved.levelDeep || 0)) return 1
		if ((a.resolved.levelDeep || 0) < (b.resolved.levelDeep || 0)) return -1

		if (a.id > b.id) return 1
		if (a.id < b.id) return -1

		return 0
	})
	// Step 1: Collect all points-of-interest (which points in time we want to evaluate)
	// and which instances that are interesting
	const pointsInTime: {
		[time: string]: Array<{
			obj: ResolvedTimelineObject
			instance: TimelineObjectInstance

			/** the same checkId is only going to be checked once per timestamp */
			checkId: string

			/** The order in which to resolve the instance */
			order: number
		}>
	} = {}
	const addPointInTime = (
		time: number,
		checkId: string,
		order: number,
		obj: ResolvedTimelineObject,
		instance: TimelineObjectInstance
	) => {
		// Note on order: Ending events come before starting events

		if (!pointsInTime[time + '']) pointsInTime[time + ''] = []
		pointsInTime[time + ''].push({ obj, instance, checkId, order })
	}

	for (const obj of resolvedObjects) {
		if (!obj.disabled && obj.resolved.resolved) {
			if (!obj.resolved.isKeyframe) {
				const parentTimes = getTimesFromParents(resolved, obj)
				if (obj.layer) {
					// if layer is empty, don't put in state
					for (const instance of obj.resolved.instances) {
						const timeEvents: Array<TimeEvent> = []

						timeEvents.push({ time: instance.start, enable: true })
						if (instance.end) timeEvents.push({ time: instance.end, enable: false })

						// Also include times from parents, as they could affect the state of this instance:
						for (let i = 0; i < parentTimes.length; i++) {
							const parentTime = parentTimes[i]

							if (
								parentTime &&
								parentTime.time > (instance.start || 0) &&
								parentTime.time < (instance.end ?? Infinity)
							) {
								timeEvents.push(parentTime)
							}
						}
						// Save a reference to this instance on all points in time that could affect it:
						for (let i = 0; i < timeEvents.length; i++) {
							const timeEvent = timeEvents[i]

							if (timeEvent.enable) {
								addPointInTime(timeEvent.time, 'start', 1, obj, instance)
							} else {
								addPointInTime(timeEvent.time, 'end', 0, obj, instance)
							}
						}
					}
				}
			} else if (obj.resolved.isKeyframe && obj.resolved.parentId) {
				const keyframe = obj
				// Also add keyframes to pointsInTime:

				for (const instance of keyframe.resolved.instances) {
					// Keyframe start time
					addPointInTime(instance.start, 'start', 1, keyframe, instance)

					// Keyframe end time
					if (instance.end !== null) {
						addPointInTime(instance.end, 'end', 0, keyframe, instance)
					}
				}
			}
		}
	}

	// Step 2: Resolve the state for the points-of-interest
	// This is done by sweeping the points-of-interest chronologically,
	// determining the state for every point in time by adding & removing objects from aspiringInstances
	// Then sorting it to determine who takes precedence

	const eventObjectTimes: { [time: string]: EventType } = {}

	const currentState: StateInTime = {}
	const activeObjIds: { [id: string]: ResolvedTimelineObjectInstance } = {}
	const activeKeyframes: { [id: string]: ResolvedTimelineObjectInstance } = {}
	const activeKeyframesChecked: { [id: string]: true } = {}

	/** The objects in aspiringInstances  */
	const aspiringInstances: {
		[layer: string]: Array<{ obj: ResolvedTimelineObject; instance: TimelineObjectInstance }>
	} = {}

	const keyframeEvents: NextEvent[] = []

	const times: number[] = Object.keys(pointsInTime)
		.map((time) => parseFloat(time))
		// Sort chronologically:
		.sort((a, b) => a - b)

	// Iterate through all points-of-interest times:
	for (let i = 0; i < times.length; i++) {
		const time = times[i]

		const instancesToCheck = pointsInTime[time]
		const checkedObjectsThisTime: { [instanceId: string]: true } = {}

		instancesToCheck.sort((a, b) => {
			if (a.obj.resolved && b.obj.resolved) {
				// Keyframes comes first:
				if (a.obj.resolved.isKeyframe && !b.obj.resolved.isKeyframe) return -1
				if (!a.obj.resolved.isKeyframe && b.obj.resolved.isKeyframe) return 1

				if (a.order > b.order) return 1
				if (a.order < b.order) return -1

				// Deeper objects (children in groups) comes later, we want to check the parent groups first:
				if ((a.obj.resolved.levelDeep || 0) > (b.obj.resolved.levelDeep || 0)) return 1
				if ((a.obj.resolved.levelDeep || 0) < (b.obj.resolved.levelDeep || 0)) return -1
			}

			return 0
		})

		for (let j = 0; j < instancesToCheck.length; j++) {
			const o = instancesToCheck[j]
			const obj: ResolvedTimelineObject = o.obj
			const instance: TimelineObjectInstance = o.instance

			let toBeEnabled: boolean = (instance.start || 0) <= time && (instance.end ?? Infinity) > time

			const layer: string = obj.layer + ''

			const identifier = obj.id + '_' + instance.id + '_' + o.checkId
			if (!checkedObjectsThisTime[identifier]) {
				// Only check each object and event-type once for every point in time
				checkedObjectsThisTime[identifier] = true

				if (!obj.resolved.isKeyframe) {
					// If object has a parent, only set if parent is on a layer (if layer is set for parent)
					if (toBeEnabled && obj.resolved.parentId) {
						const parentObj = obj.resolved.parentId ? resolved.objects[obj.resolved.parentId] : null
						toBeEnabled = !!(parentObj && (!parentObj.layer || activeObjIds[parentObj.id]))
					}
					if (!aspiringInstances[obj.layer]) aspiringInstances[obj.layer] = []
					if (toBeEnabled) {
						// The instance wants to be enabled (is starting)

						// Add to aspiringInstances:
						aspiringInstances[obj.layer].push({ obj, instance })
					} else {
						// The instance doesn't want to be enabled (is ending)

						// Remove from aspiringInstances:
						aspiringInstances[layer] = (aspiringInstances[layer] || []).filter((o) => o.obj.id !== obj.id)
					}

					// Evaluate the layer to determine who has the throne:
					aspiringInstances[layer].sort((a, b) => {
						// Determine who takes precedence:

						// First, sort using priority
						if ((a.obj.priority || 0) < (b.obj.priority || 0)) return 1
						if ((a.obj.priority || 0) > (b.obj.priority || 0)) return -1

						// Then, sort using the start time
						if ((a.instance.start || 0) < (b.instance.start || 0)) return 1
						if ((a.instance.start || 0) > (b.instance.start || 0)) return -1

						// Last resort: sort using id:
						if (a.obj.id > b.obj.id) return 1
						if (a.obj.id < b.obj.id) return -1

						return 0
					})

					// Now, the one on top has the throne
					// Update current state:
					const currentOnTopOfLayer = aspiringInstances[layer][0]
					const prevObj: ResolvedTimelineObjectInstance | undefined = currentState[layer]

					const replaceOldObj: boolean =
						currentOnTopOfLayer &&
						(!prevObj ||
							prevObj.id !== currentOnTopOfLayer.obj.id ||
							prevObj.instance.id !== currentOnTopOfLayer.instance.id)
					const removeOldObj: boolean = !currentOnTopOfLayer && prevObj

					if (replaceOldObj || removeOldObj) {
						if (prevObj) {
							// Cap the old instance, so it'll end at this point in time:
							setInstanceEndTime(prevObj.instance, time)

							// Update activeObjIds:
							delete activeObjIds[prevObj.id]

							// Add to nextEvents:

							resolvedStates.nextEvents.push({
								type: EventType.END,
								time: time,
								objId: prevObj.id,
							})
							eventObjectTimes[instance.end + ''] = EventType.END
						}
					}
					let changed = false
					if (replaceOldObj) {
						// Set the new object to State

						// Construct a new object clone:
						let newObj: ResolvedTimelineObject
						if (resolvedStates.objects[currentOnTopOfLayer.obj.id]) {
							// Use the already existing one
							newObj = resolvedStates.objects[currentOnTopOfLayer.obj.id]
						} else {
							newObj = {
								...currentOnTopOfLayer.obj,
								content: JSON.parse(JSON.stringify(currentOnTopOfLayer.obj.content)),
								resolved: {
									...(currentOnTopOfLayer.obj.resolved || {}),
									instances: [],
								},
							}

							addObjectToResolvedTimeline(resolvedStates, newObj)
						}
						const newInstance: TimelineObjectInstance = {
							...currentOnTopOfLayer.instance,
							// We're setting new start & end times so they match up with the state:
							start: time,
							end: null,
							fromInstanceId: currentOnTopOfLayer.instance.id,

							originalEnd:
								currentOnTopOfLayer.instance.originalEnd !== undefined
									? currentOnTopOfLayer.instance.originalEnd
									: currentOnTopOfLayer.instance.end,
							originalStart:
								currentOnTopOfLayer.instance.originalStart !== undefined
									? currentOnTopOfLayer.instance.originalStart
									: currentOnTopOfLayer.instance.start,
						}
						// Make the instance id unique:
						for (let i = 0; i < newObj.resolved.instances.length; i++) {
							if (newObj.resolved.instances[i].id === newInstance.id) {
								newInstance.id = newInstance.id + '_$' + newObj.resolved.instances.length
							}
						}
						newObj.resolved.instances.push(newInstance)

						const newObjInstance = {
							...newObj,
							instance: newInstance,
						}

						// Save to current state:
						currentState[layer] = newObjInstance

						// Update activeObjIds:
						activeObjIds[newObjInstance.id] = newObjInstance

						// Add to nextEvents:
						resolvedStates.nextEvents.push({
							type: EventType.START,
							time: newInstance.start,
							objId: newObj.id,
						})
						eventObjectTimes[newInstance.start + ''] = EventType.START

						changed = true
					} else if (removeOldObj) {
						// Remove from current state:
						delete currentState[layer]

						changed = true
					}

					if (changed) {
						// Also make sure any children are updated:
						// Go through the object on hand, but also the one in the currentState
						const parentsToCheck: ResolvedTimelineObject[] = []
						if (obj.isGroup) parentsToCheck.push(obj)
						if (currentState[layer]?.isGroup) parentsToCheck.push(currentState[layer])
						for (const parent of parentsToCheck) {
							if (parent.children?.length) {
								for (const child0 of parent.children) {
									const child = resolved.objects[child0.id]
									for (const instance of child.resolved.instances) {
										if (instance.start <= time && (instance.end ?? Infinity) > time) {
											// Add the child instance, because that might be affected:
											addPointInTime(time, 'child', 99, child, instance)
										}
									}
								}
							}
						}
					}
				} else {
					// Is a keyframe
					const keyframe = obj

					// Add keyframe to resolvedStates.objects:
					resolvedStates.objects[keyframe.id] = keyframe

					const toBeEnabled: boolean = (instance.start || 0) <= time && (instance.end ?? Infinity) > time

					if (toBeEnabled) {
						const newObjInstance = {
							...keyframe,
							instance: instance,
						}
						activeKeyframes[keyframe.id] = newObjInstance
					} else {
						delete activeKeyframes[keyframe.id]
						delete activeKeyframesChecked[keyframe.id]
					}
				}
			}
		}

		// Go through keyframes:
		const activeKeyframesObjIds = Object.keys(activeKeyframes)
		for (let i = 0; i < activeKeyframesObjIds.length; i++) {
			const objId: string = activeKeyframesObjIds[i]
			const objInstance: ResolvedTimelineObjectInstance = activeKeyframes[objId]

			const keyframe = objInstance
			const instance = objInstance.instance

			// Check if the keyframe's parent is currently active?
			if (keyframe.resolved.parentId) {
				const parentObj = activeObjIds[keyframe.resolved.parentId]
				if (parentObj && parentObj.layer) {
					// keyframe is on an active object

					const parentObjInstance = currentState[parentObj.layer]

					if (parentObjInstance) {
						if (!activeKeyframesChecked[objId]) {
							// hasn't started before
							activeKeyframesChecked[objId] = true

							// Note: The keyframes are a little bit special, since their contents are applied to their parents.
							// That application is done in the getStateAtTime function.

							// Add keyframe to nextEvents:
							keyframeEvents.push({
								type: EventType.KEYFRAME,
								time: instance.start,
								objId: keyframe.id,
							})
							// Cap end within parent
							let instanceEnd: number | null = Math.min(
								instance.end ?? Infinity,
								parentObjInstance.instance.end ?? Infinity
							)
							if (instanceEnd === Infinity) instanceEnd = null

							if (instanceEnd !== null) {
								keyframeEvents.push({
									type: EventType.KEYFRAME,
									time: instanceEnd,
									objId: keyframe.id,
								})
							}
						}
						continue
					}
				}
			}
			// else: the keyframe:s parent isn't active, remove/stop the keyframe then:
			delete activeKeyframesChecked[objId]
		}
	}

	// At this point, the instances of all objects (excluding keyframes) are properly calculated,
	// taking into account priorities, clashes etc.

	// Cap children inside their parents:
	{
		const allChildren = Object.values(resolvedStates.objects)
			.filter((obj) => !!obj.resolved.parentId)
			// Sort, so that the outermost are handled first:
			.sort((a, b) => {
				return (a.resolved.levelDeep ?? 0) - (b.resolved.levelDeep ?? 0)
			})

		for (const obj of allChildren) {
			if (obj.resolved.parentId) {
				const parent = resolvedStates.objects[obj.resolved.parentId]
				if (parent) {
					obj.resolved.instances = cleanInstances(
						capInstances(obj.resolved.instances, parent.resolved.instances),
						false,
						false
					)
				}
			}
		}
	}

	// At this point, all instances of the objects should be properly calculated.
	// Go through all instances of all objects to create temporary states of all layers and times:
	{
		const states: {
			[layer: string]: {
				[time: string]: {
					/** The number of starts found at this time. (Used to check for fatal bugs) */
					startCount: number
					/** The number of ends found at this time. (Used to check for fatal bugs) */
					endCount: number
					objectInstance: ResolvedTimelineObjectInstanceKeyframe | null
				}
			}
		} = {}
		for (const id of Object.keys(resolvedStates.objects)) {
			const obj = resolvedStates.objects[id]
			const layer = `${obj.layer}`

			if (!states[layer]) states[layer] = {}
			const stateLayer = states[layer]

			if (!obj.resolved.isKeyframe) {
				for (const instance of obj.resolved.instances) {
					if (instance.start === instance.end) continue

					const startTime = instance.start + ''
					if (!stateLayer[startTime]) {
						stateLayer[startTime] = {
							startCount: 0,
							endCount: 0,
							objectInstance: null,
						}
					}

					const newObjInstance = {
						...obj,
						instance: instance,
					}

					stateLayer[startTime].startCount++
					stateLayer[startTime].objectInstance = newObjInstance

					if (instance.end !== null) {
						const endTime = instance.end + ''
						if (!stateLayer[endTime]) {
							stateLayer[endTime] = {
								startCount: 0,
								endCount: 0,
								objectInstance: null,
							}
						}
						stateLayer[endTime].endCount++
					}
				}
			}
		}
		// Go through the temporary states and apply the changes to the resolvedStates.state:
		for (const layer of Object.keys(states)) {
			let sum = 0

			const times: number[] = Object.keys(states[layer])
				.map((time) => parseFloat(time))
				// Sort chronologically:
				.sort((a, b) => a - b)

			for (let i = 0; i < times.length; i++) {
				const time = times[i]

				const s = states[layer][`${time}`]
				sum += s.startCount
				sum -= s.endCount

				// Check for fatal bugs:
				// If the sum is larger than one, more than one start was found at the same time, which should not be possible.
				if (sum > 1) throw new Error(`Too many start events at ${layer} ${time}: ${sum}`)
				// If the sum is less than zero, there have been more ends than starts, which should not be possible.
				if (sum < 0) throw new Error(`Too many end events at ${layer} ${time}: ${sum}`)

				// Apply the state:
				if (!resolvedStates.state[layer]) resolvedStates.state[layer] = {}
				if (sum) {
					// This means that the object has started
					if (!s.objectInstance)
						throw new Error(`objectInstance not set, event though sum=${sum} at ${layer} ${time}`)

					resolvedStates.state[layer][time] = [s.objectInstance]
				} else {
					// This means that the object has ended
					resolvedStates.state[layer][time] = null
				}
			}
		}
	}

	// Cap keyframes inside their parents:
	for (const id of Object.keys(resolvedStates.objects)) {
		{
			const keyframe = resolvedStates.objects[id]
			if (keyframe.resolved.isKeyframe && keyframe.resolved.parentId) {
				const parent = resolvedStates.objects[keyframe.resolved.parentId]
				if (parent) {
					// Cap the keyframe instances within its parents instances:
					keyframe.resolved.instances = capInstances(keyframe.resolved.instances, parent.resolved.instances)

					// Ensure sure the instances are in the state
					for (let i = 0; i < keyframe.resolved.instances.length; i++) {
						const instance = keyframe.resolved.instances[i]

						const keyframeInstance: ResolvedTimelineObjectInstanceKeyframe = {
							...keyframe,
							instance: instance,
							isKeyframe: true,
							keyframeEndTime: instance.end,
						}
						// Add keyframe to the tracking state:
						addKeyframeAtTime(resolvedStates.state, parent.layer + '', instance.start, keyframeInstance)
					}
				}
			}
		}

		// Fix (merge) instances of seamless objects:
		{
			const obj = resolvedStates.objects[id]
			if (obj.seamless && obj.resolved.instances.length > 1) {
				obj.resolved.instances = cleanInstances(obj.resolved.instances, true, false)
			}
		}
	}

	// At this point, ALL instances are properly calculated.

	// Go through the keyframe events and add them to nextEvents:
	for (let i = 0; i < keyframeEvents.length; i++) {
		const keyframeEvent = keyframeEvents[i]
		// tslint:disable-next-line
		if (eventObjectTimes[keyframeEvent.time + ''] === undefined) {
			// no need to put a keyframe event if there's already another event there
			resolvedStates.nextEvents.push(keyframeEvent)
			eventObjectTimes[keyframeEvent.time + ''] = EventType.KEYFRAME
		}
	}

	resolvedStates.nextEvents.sort((a, b) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		if (a.type > b.type) return -1
		if (a.type < b.type) return 1

		if (a.objId < b.objId) return -1
		if (a.objId > b.objId) return 1

		return 0
	})

	if (cache) {
		cache.resolvedStates = resolvedStates
	}

	return resolvedStates
}
export function applyKeyframeContent(parentContent: Content, keyframeContent: Content): void {
	for (const [attr, value] of Object.entries(keyframeContent)) {
		if (Array.isArray(value)) {
			if (!Array.isArray(parentContent[attr])) parentContent[attr] = []
			applyKeyframeContent(parentContent[attr], value)
			parentContent[attr].splice(value.length, 99999)
		} else if (_.isObject(value)) {
			if (!_.isObject(parentContent[attr]) || Array.isArray(parentContent[attr])) parentContent[attr] = {}
			applyKeyframeContent(parentContent[attr], value)
		} else {
			parentContent[attr] = value
		}
	}
}
function getTimesFromParents(resolved: ResolvedTimeline, obj: ResolvedTimelineObject): TimeEvent[] {
	let times: TimeEvent[] = []
	const parentObj = obj.resolved.parentId ? resolved.objects[obj.resolved.parentId] : null
	if (parentObj && parentObj.resolved.resolved) {
		for (const instance of parentObj.resolved.instances) {
			times.push({ time: instance.start, enable: true })
			if (instance.end) times.push({ time: instance.end, enable: false })
		}
		times = times.concat(getTimesFromParents(resolved, parentObj))
	}
	return times
}

function addKeyframeAtTime(
	states: AllStates,
	layer: string,
	time: number,
	objInstanceKf: ResolvedTimelineObjectInstanceKeyframe
) {
	if (!states[layer]) states[layer] = {}

	const inner = states[layer][time + '']
	if (!inner) {
		states[layer][time + ''] = [objInstanceKf]
	} else {
		inner.push(objInstanceKf)
	}
}
function getStateAtTime(states: AllStates, layer: string, requestTime: number): ResolvedTimelineObjectInstance | null {
	const layerStates = states[layer] || {}

	const times: number[] = Object.keys(layerStates)
		.map((time) => parseFloat(time))
		// Sort chronologically:
		.sort((a, b) => {
			return a - b
		})

	let state: ResolvedTimelineObjectInstance | null = null
	let isCloned = false
	for (let i = 0; i < times.length; i++) {
		const time = times[i]
		if (time <= requestTime) {
			const currentStateInstances = layerStates[time + '']
			if (currentStateInstances && currentStateInstances.length) {
				const keyframes: ResolvedTimelineObjectInstanceKeyframe[] = []
				for (let i = 0; i < currentStateInstances.length; i++) {
					const currentState = currentStateInstances[i]

					if (currentState && currentState.isKeyframe) {
						keyframes.push(currentState)
					} else {
						state = currentState
						isCloned = false
					}
				}
				for (let i = 0; i < keyframes.length; i++) {
					const keyframe = keyframes[i]
					if (state && keyframe.resolved.parentId === state.id) {
						if ((keyframe.keyframeEndTime ?? Infinity) > requestTime) {
							if (!isCloned) {
								isCloned = true
								state = {
									...state,
									content: JSON.parse(JSON.stringify(state.content)),
								}
							}
							// Apply the keyframe on the state:
							applyKeyframeContent(state.content, keyframe.content)
						}
					}
				}
			} else {
				state = null
				isCloned = false
			}
		} else {
			break
		}
	}
	return state
}
function isResolvedStates(resolved: any): resolved is ResolvedStates {
	return !!(resolved && typeof resolved === 'object' && resolved.objects && resolved.state && resolved.nextEvents)
}
