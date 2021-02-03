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
	ResolverCache
} from '../api/api'
import * as _ from 'underscore'
import { addObjectToResolvedTimeline } from './common'
import { EventType } from '../api/enums'
import { capInstances, cleanInstances, setInstanceEndTime } from '../lib'

export function getState (resolved: ResolvedTimeline | ResolvedStates, time: Time, eventLimit: number = 0): TimelineState {
	const resolvedStates: ResolvedStates = (
		isResolvedStates(resolved) ?
		resolved :
		resolveStates(resolved, time)
	)

	const state: TimelineState = {
		time: time,
		layers: {},
		nextEvents: _.filter(resolvedStates.nextEvents, e => e.time > time)
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
export function resolveStates (resolved: ResolvedTimeline, onlyForTime?: Time, cache?: ResolverCache): ResolvedStates {
	const resolvedStates: ResolvedStates = {
		options: resolved.options,
		statistics: resolved.statistics,

		// These will be re-created during the state-resolving:
		objects: {},
		classes: {},
		layers: {},

		state: {},
		nextEvents: []
	}

	if (
		cache &&
		!onlyForTime &&
		resolved.statistics.resolvingCount === 0 &&
		cache.resolvedStates
	) {
		// Nothing has changed since last time, just return the states right away:
		return cache.resolvedStates
	}

	const resolvedObjects = _.values(resolved.objects)
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
			obj: ResolvedTimelineObject,
			instance: TimelineObjectInstance,
			 /** if the instance turns on or off at this point */
			enable: boolean
		}>
	} = {}
	const addPointInTime = (
		time: Number,
		enable: boolean,
		obj: ResolvedTimelineObject,
		instance: TimelineObjectInstance
	) => {
		if (!pointsInTime[time + '']) pointsInTime[time + ''] = []
		pointsInTime[time + ''].push({ obj, instance, enable: enable })
	}

	for (const obj of resolvedObjects) {
		if (
			!obj.disabled &&
			obj.resolved.resolved
		) {
			if (!obj.resolved.isKeyframe) {
				const parentTimes = getTimesFromParents(resolved, obj)
				if (obj.layer) { // if layer is empty, don't put in state
					for (const instance of obj.resolved.instances) {

						let useInstance: boolean = true
						if (onlyForTime) {
							useInstance = (
								(instance.start || 0) <= onlyForTime &&
								(instance.end || Infinity) > onlyForTime
							)
						}
						if (useInstance) {
							const timeEvents: Array<TimeEvent> = []

							timeEvents.push({ time: instance.start, enable: true })
							if (instance.end) timeEvents.push({ time: instance.end, enable: false })

							// Also include times from parents, as they could affect the state of this instance:
							for (let i = 0; i < parentTimes.length; i++) {
								const parentTime = parentTimes[i]

								if (
									parentTime && (
										parentTime.time > (instance.start || 0) &&
										parentTime.time < (instance.end || Infinity)
									)
								) {
									timeEvents.push(parentTime)
								}
							}
							// Save a reference to this instance on all points in time that could affect it:
							for (let i = 0; i < timeEvents.length; i++) {
								const timeEvent = timeEvents[i]

								addPointInTime(timeEvent.time, timeEvent.enable, obj, instance)
							}
						}
					}
				}
			} else if (
				obj.resolved.isKeyframe &&
				obj.resolved.parentId
			) {
				const keyframe = obj
				// Also add keyframes to pointsInTime:

				for (const instance of keyframe.resolved.instances) {
					// Keyframe start time
					addPointInTime(instance.start, true, keyframe, instance)

					// Keyframe end time
					if (instance.end !== null) {
						addPointInTime(instance.end, false, keyframe, instance)
					}
				}
			}
		}
	}

	// Step 2: Resolve the state for the points-of-interest
	// This is done by sweeping the points-of-interest chronologically,
	// determining the state for every point in time by adding & removing objects from aspiringInstances
	// Then sorting it to determine who takes precedence

	const eventObjectTimes: {[time: string]: EventType} = {}

	const currentState: StateInTime = {}
	const activeObjIds: {[id: string]: ResolvedTimelineObjectInstance} = {}
	const activeKeyframes: {[id: string]: ResolvedTimelineObjectInstance} = {}
	const activeKeyframesChecked: {[id: string]: true} = {}

	/** The objects in aspiringInstances  */
	const aspiringInstances: {[layer: string]: Array<{obj: ResolvedTimelineObject, instance: TimelineObjectInstance}>} = {}

	const keyframeEvents: NextEvent[] = []

	const times: number[] = Object.keys(pointsInTime)
		.map(time => parseFloat(time))
		// Sort chronologically:
		.sort((a,b) => a - b)

	// Iterate through all points-of-interest times:
	for (let i = 0; i < times.length; i++) {
		const time = times[i]

		const instancesToCheck = pointsInTime[time]
		const checkedObjectsThisTime: {[instanceId: string]: true} = {}

		instancesToCheck.sort((a, b) => {

			if (a.obj.resolved && b.obj.resolved) {

				// Keyframes comes first:
				if (a.obj.resolved.isKeyframe && !b.obj.resolved.isKeyframe) return -1
				if (!a.obj.resolved.isKeyframe && b.obj.resolved.isKeyframe) return 1

				// Ending events come before starting events:
				if (a.enable && !b.enable) return 1
				if (!a.enable && b.enable) return -1

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

			let toBeEnabled: boolean = (
				(instance.start || 0) <= time &&
				(instance.end || Infinity) > time
			)

			const layer: string = obj.layer + ''
			const identifier = obj.id + '_' + instance.id + '_' + o.enable
			if (!checkedObjectsThisTime[identifier]) { // Only check each object and event-type once for every point in time
				checkedObjectsThisTime[identifier] = true

				if (!obj.resolved.isKeyframe) {

					// If object has a parent, only set if parent is on a layer (if layer is set for parent)
					if (toBeEnabled && obj.resolved.parentId) {
						const parentObj = (
							obj.resolved.parentId ?
							resolved.objects[obj.resolved.parentId] :
							null
						)
						toBeEnabled = !!(
							parentObj &&
							(
								!parentObj.layer ||
								activeObjIds[parentObj.id]
							)
						)
					}
					if (!aspiringInstances[obj.layer]) aspiringInstances[obj.layer] = []
					if (toBeEnabled) {
						// The instance wants to be enabled (is starting)

						// Add to aspiringInstances:
						aspiringInstances[obj.layer].push({ obj, instance })

					} else {
						// The instance doesn't want to be enabled (is ending)

						// Remove from aspiringInstances:
						aspiringInstances[layer] = _.reject(aspiringInstances[layer] || [], o => o.obj.id === obj.id)
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
					const prevObj = currentState[layer]

					const replaceOldObj: boolean = (
						currentOnTopOfLayer &&
						(
							!prevObj ||
							prevObj.id !== currentOnTopOfLayer.obj.id ||
							prevObj.instance.id !== currentOnTopOfLayer.instance.id
						)
					)
					const removeOldObj: boolean = (
						!currentOnTopOfLayer &&
						prevObj
					)

					if (replaceOldObj || removeOldObj) {
						if (prevObj) {
							// Cap the old instance, so it'll end at this point in time:
							setInstanceEndTime(prevObj.instance, time)

							// Update activeObjIds:
							delete activeObjIds[prevObj.id]

							// Add to nextEvents:
							if (
								!onlyForTime ||
								time > onlyForTime
							) {
								resolvedStates.nextEvents.push({
									type: EventType.END,
									time: time,
									objId: prevObj.id
								})
								eventObjectTimes[instance.end + ''] = EventType.END
							}
						}
					}
					if (replaceOldObj) {
						// Set the new object to State

						// Construct a new object clone:
						let newObj: ResolvedTimelineObject
						if (resolvedStates.objects[currentOnTopOfLayer.obj.id]) {
							// Use the already existing one
							newObj = resolvedStates.objects[currentOnTopOfLayer.obj.id]
						} else {
							newObj = _.clone(currentOnTopOfLayer.obj)
							newObj.content = JSON.parse(JSON.stringify(newObj.content))
							newObj.resolved = {
								...newObj.resolved || {},
								instances: []
							}

							addObjectToResolvedTimeline(resolvedStates, newObj)
						}
						const newInstance: TimelineObjectInstance = {
							...currentOnTopOfLayer.instance,
							// We're setting new start & end times so they match up with the state:
							start: time,
							end: null,
							fromInstanceId: currentOnTopOfLayer.instance.id,

							originalEnd: (
								currentOnTopOfLayer.instance.originalEnd !== undefined ?
								currentOnTopOfLayer.instance.originalEnd :
								currentOnTopOfLayer.instance.end
							),
							originalStart: (
								currentOnTopOfLayer.instance.originalStart !== undefined ?
								currentOnTopOfLayer.instance.originalStart :
								currentOnTopOfLayer.instance.start
							)
						}
						// Make the instance id unique:
						for (let i = 0; i < newObj.resolved.instances.length; i++) {
							const instance = newObj.resolved.instances[i]

							if (instance.id === newInstance.id) {
								newInstance.id = newInstance.id + '_$' + newObj.resolved.instances.length
							}
						}
						newObj.resolved.instances.push(newInstance)

						const newObjInstance = {
							...newObj,
							instance: newInstance
						}

						// Save to current state:
						currentState[layer] = newObjInstance

						// Update activeObjIds:
						activeObjIds[newObjInstance.id] = newObjInstance

						// Update the tracking state as well:
						setStateAtTime(resolvedStates.state, layer, time, newObjInstance)

						// Add to nextEvents:
						if (newInstance.start > (onlyForTime || 0)) {
							resolvedStates.nextEvents.push({
								type: EventType.START,
								time: newInstance.start,
								objId: obj.id
							})
							eventObjectTimes[newInstance.start + ''] = EventType.START
						}
					} else if (removeOldObj) {

						// Remove from current state:
						delete currentState[layer]

						// Update the tracking state as well:
						setStateAtTime(resolvedStates.state, layer, time, null)
					}
				} else {
					// Is a keyframe
					const keyframe = obj

					// Add keyframe to resolvedStates.objects:
					resolvedStates.objects[keyframe.id] = keyframe

					const toBeEnabled: boolean = (
						(instance.start || 0) <= time &&
						(instance.end || Infinity) > time
					)

					if (toBeEnabled) {
						const newObjInstance = {
							...keyframe,
							instance: instance
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
				if (parentObj && parentObj.layer) {  // keyframe is on an active object

					const parentObjInstance = currentState[parentObj.layer]

					if (parentObjInstance) {

						if (!activeKeyframesChecked[objId]) { // hasn't started before
							activeKeyframesChecked[objId] = true

							// Note: The keyframes are a little bit special, since their contents are applied to their parents.
							// That application is done in the getStateAtTime function.

							// Add keyframe to nextEvents:
							keyframeEvents.push({
								type: EventType.KEYFRAME,
								time: instance.start,
								objId: keyframe.id
							})
							// Cap end within parent
							let instanceEnd: number | null = Math.min(
								instance.end || Infinity,
								parentObjInstance.instance.end || Infinity
							)
							if (instanceEnd === Infinity) instanceEnd = null

							if (instanceEnd !== null) {
								keyframeEvents.push({
									type: EventType.KEYFRAME,
									time: instanceEnd,
									objId: keyframe.id
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

	for (const id of Object.keys(resolvedStates.objects)) {
		const keyframe = resolvedStates.objects[id]
		if (
			keyframe.resolved.isKeyframe &&
			keyframe.resolved.parentId
		) {
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
						keyframeEndTime: instance.end
					}
					// Add keyframe to the tracking state:
					addKeyframeAtTime(resolvedStates.state, parent.layer + '', instance.start, keyframeInstance)
				}
			}
		}

		const obj = resolvedStates.objects[id]
		if (obj.seamless && obj.resolved.instances.length > 1) {
			obj.resolved.instances = cleanInstances(
				obj.resolved.instances, true, false

			)
		}
	}

	// At this point, ALL instances are properly calculated.

	// Go through the keyframe events and add them to nextEvents:
	for (let i = 0; i < keyframeEvents.length; i++) {
		const keyframeEvent = keyframeEvents[i]
		// tslint:disable-next-line
		if (eventObjectTimes[keyframeEvent.time + ''] === undefined) { // no need to put a keyframe event if there's already another event there
			resolvedStates.nextEvents.push(keyframeEvent)
			eventObjectTimes[keyframeEvent.time + ''] = EventType.KEYFRAME
		}
	}

	if (onlyForTime) {
		resolvedStates.nextEvents = _.filter(resolvedStates.nextEvents, e => e.time > onlyForTime)
	}
	resolvedStates.nextEvents.sort((a,b) => {
		if (a.time > b.time) return 1
		if (a.time < b.time) return -1

		if (a.type > b.type) return -1
		if (a.type < b.type) return 1

		if (a.objId < b.objId) return -1
		if (a.objId > b.objId) return 1

		return 0
	})

	if (cache && !onlyForTime) {
		cache.resolvedStates = resolvedStates
	}

	return resolvedStates
}
export function applyKeyframeContent (parentContent: Content, keyframeContent: Content) {
	_.each(keyframeContent, (value: any, attr: string) => {
		if (_.isArray(value)) {
			if (!_.isArray(parentContent[attr])) parentContent[attr] = []
			applyKeyframeContent(parentContent[attr], value)
			parentContent[attr].splice(value.length, 99999)
		} else if (_.isObject(value)) {
			if (
				!_.isObject(parentContent[attr]) ||
				_.isArray(parentContent[attr])
			) parentContent[attr] = {}
			applyKeyframeContent(parentContent[attr], value)
		} else {
			parentContent[attr] = value
		}
	})
}
function getTimesFromParents (resolved: ResolvedTimeline, obj: ResolvedTimelineObject): TimeEvent[] {
	let times: TimeEvent[] = []
	const parentObj = (
		obj.resolved.parentId ?
		resolved.objects[obj.resolved.parentId] :
		null
	)
	if (parentObj && parentObj.resolved.resolved) {
		for (const instance of parentObj.resolved.instances) {
			times.push({ time: instance.start, enable: true })
			if (instance.end) times.push({ time: instance.end, enable: false })
		}
		times = times.concat(getTimesFromParents(resolved, parentObj))
	}
	return times
}

function setStateAtTime (states: AllStates, layer: string, time: number, objInstance: ResolvedTimelineObjectInstanceKeyframe | null) {
	if (!states[layer]) states[layer] = {}
	states[layer][time + ''] = objInstance ? [objInstance] : objInstance
}
function addKeyframeAtTime (states: AllStates, layer: string, time: number, objInstanceKf: ResolvedTimelineObjectInstanceKeyframe | null) {
	if (!states[layer]) states[layer] = {}

	if (!states[layer][time + '']) states[layer][time + ''] = []
	// @ts-ignore object is possibly null
	states[layer][time + ''].push(objInstanceKf)
}
function getStateAtTime (states: AllStates, layer: string, requestTime: number): ResolvedTimelineObjectInstance | null {
	const layerStates = states[layer] || {}

	const times: number[] = _.map(_.keys(layerStates), time => parseFloat(time))
	times.sort((a,b) => {
		return a - b
	})
	let state: ResolvedTimelineObjectInstance | null = null
	let isCloned: boolean = false
	for (let i = 0; i < times.length; i++) {
		const time = times[i]
		if (time <= requestTime) {
			const currentStateInstances = layerStates[time + '']
			if (currentStateInstances && currentStateInstances.length) {
				const keyframes: ResolvedTimelineObjectInstanceKeyframe[] = []
				for (let i = 0; i < currentStateInstances.length; i++) {
					const currentState = currentStateInstances[i]

					if (
						currentState &&
						currentState.isKeyframe
					) {
						keyframes.push(currentState)
					} else {
						state = currentState
						isCloned = false
					}
				}
				for (let i = 0; i < keyframes.length; i++) {
					const keyframe = keyframes[i]
					if (state && keyframe.resolved.parentId === state.id) {
						if ((keyframe.keyframeEndTime || Infinity) > requestTime) {
							if (!isCloned) {
								isCloned = true
								state = {
									...state,
									content: JSON.parse(JSON.stringify(state.content))
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
function isResolvedStates (resolved: any): resolved is ResolvedStates {
	return !!(
		resolved &&
		typeof resolved === 'object' &&
		resolved.objects &&
		resolved.state &&
		resolved.nextEvents
	)
}
