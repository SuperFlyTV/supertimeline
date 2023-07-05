import { Content, ResolvedTimeline, ResolvedTimelineObjectInstance, Time, TimelineState } from '../api'
import { instanceIsActive } from './lib/instance'
import { clone, isObject } from './lib/lib'
import { tic } from './lib/performance'
import { objHasLayer } from './lib/timeline'

export class StateHandler {
	public getState(resolvedTimeline: ResolvedTimeline, time: Time, eventLimit = 0): TimelineState {
		const toc = tic('getState')
		const state: TimelineState = {
			time: time,
			layers: {},
			nextEvents: resolvedTimeline.nextEvents.filter((e) => e.time > time),
		}

		if (eventLimit) state.nextEvents = state.nextEvents.slice(0, eventLimit)

		for (const obj of Object.values(resolvedTimeline.objects)) {
			if (!objHasLayer(obj)) continue
			if (obj.resolved.isKeyframe) continue

			for (const instance of obj.resolved.instances) {
				if (instanceIsActive(instance, time)) {
					let contentIsOriginal = true
					const objInstance: ResolvedTimelineObjectInstance = {
						...obj,
						instance,
					}
					if (state.layers[`${obj.layer}`]) {
						// There is already an object on this layer!
						console.error(state.layers[`${obj.layer}`])
						console.error(objInstance)
						throw new Error(`Internal Error: There is already an object on layer "${obj.layer}"!`)
					}

					state.layers[`${obj.layer}`] = objInstance

					// Now, apply keyframes:

					const keyframes = obj.keyframes ? obj.keyframes.map((kf) => resolvedTimeline.objects[kf.id]) : []

					const keyframeInstances: ResolvedTimelineObjectInstance[] = []
					for (const keyframe of keyframes) {
						for (const instance of keyframe.resolved.instances) {
							if (instanceIsActive(instance, time)) {
								keyframeInstances.push({
									...keyframe,
									instance,
								})
							}
						}
					}
					keyframeInstances.sort((a, b) => {
						// Highest priority is applied last:
						const aPriority = a.priority ?? 0
						const bPriority = b.priority ?? 0
						if (aPriority < bPriority) return -1
						if (aPriority > bPriority) return 1

						// Last start time is applied last:
						if (a.instance.start < b.instance.start) return -1
						if (a.instance.start > b.instance.start) return 1

						return 0
					})
					for (const keyframe of keyframeInstances) {
						if (contentIsOriginal) {
							// We don't want to modify the original content, so we deep-clone it before modifying it:
							objInstance.content = clone(obj.content)
							contentIsOriginal = false
						}
						this.applyKeyframeContent(objInstance.content, keyframe.content)
						// Apply the keyframe:
						// const content: Content = {
						// 	...keyframe.content,
						// }
						// if (isObject(content)) {
						// 	content.id = keyframe.id
						// }
						// state.layers[obj.layer].content = content
					}
					// const keyframes
				}
			}
		}
		toc()
		return state
	}

	public applyKeyframeContent(parentContent: Content, keyframeContent: Content): void {
		const toc = tic('  applyKeyframeContent')
		for (const [attr, value] of Object.entries<any>(keyframeContent)) {
			if (Array.isArray(value)) {
				if (!Array.isArray(parentContent[attr])) parentContent[attr] = []
				this.applyKeyframeContent(parentContent[attr], value)
				parentContent[attr].splice(value.length, 99999)
			} else if (isObject(value)) {
				if (!isObject(parentContent[attr]) || Array.isArray(parentContent[attr])) parentContent[attr] = {}
				this.applyKeyframeContent(parentContent[attr], value)
			} else {
				parentContent[attr] = value
			}
		}
		toc()
	}
}
