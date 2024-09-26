import {
	Content,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolvedTimelineObjectInstance,
	Time,
	TimelineState,
} from '../api'
import { instanceIsActive } from './lib/instance'
import { clone, isArray, isObject } from './lib/lib'
import { tic } from './lib/performance'
import { objHasLayer } from './lib/timeline'

export class StateHandler {
	public getState<TContent extends Content = Content>(
		resolvedTimeline: ResolvedTimeline<TContent>,
		time: Time,
		eventLimit = 0
	): TimelineState<TContent> {
		const toc = tic('getState')
		const state: TimelineState<TContent> = {
			time: time,
			layers: {},
			nextEvents: resolvedTimeline.nextEvents.filter((e) => e.time > time),
		}

		if (eventLimit) state.nextEvents = state.nextEvents.slice(0, eventLimit)

		for (const obj of Object.values<ResolvedTimelineObject<TContent>>(resolvedTimeline.objects)) {
			if (!objHasLayer(obj)) continue
			// Note: We can assume that it is not a keyframe here, because keyframes don't have layers

			for (const instance of obj.resolved.instances) {
				if (instanceIsActive(instance, time)) {
					let contentIsOriginal = true
					const objInstance: ResolvedTimelineObjectInstance<TContent> = {
						...obj,
						instance,
					}
					/* istanbul ignore if */
					if (state.layers[`${obj.layer}`]) {
						// There is already an object on this layer!
						console.error(`layer "${obj.layer}": ${JSON.stringify(state.layers[`${obj.layer}`])}`)
						console.error(`object "${objInstance.id}": ${JSON.stringify(objInstance)}`)
						throw new Error(`Internal Error: There is already an object on layer "${obj.layer}"!`)
					}

					state.layers[`${obj.layer}`] = objInstance

					// Now, apply keyframes:
					const objectKeyframes: ResolvedTimelineObject[] = obj.keyframes
						? obj.keyframes.map((kf) => resolvedTimeline.objects[kf.id])
						: []

					for (const keyframe of this.getActiveKeyframeInstances(objectKeyframes, time)) {
						if (contentIsOriginal) {
							// We don't want to modify the original content, so we deep-clone it before modifying it:
							objInstance.content = clone(obj.content)
							contentIsOriginal = false
						}
						StateHandler.applyKeyframeContent(objInstance.content, keyframe.content)
					}
				}
			}
		}
		toc()
		return state
	}

	/**
	 * Apply keyframe content onto its parent content.
	 * The keyframe content is deeply-applied onto the parent content.
	 */
	public static applyKeyframeContent(parentContent: Content, keyframeContent: Content): void {
		const toc = tic('  applyKeyframeContent')
		for (const [attr, value] of Object.entries<any>(keyframeContent)) {
			if (isObject(value)) {
				if (isArray(value)) {
					// Value is an array
					if (!Array.isArray(parentContent[attr])) parentContent[attr] = []
					this.applyKeyframeContent(parentContent[attr], value)
					parentContent[attr].splice(value.length, Infinity)
				} else {
					// Value is an object
					if (!isObject(parentContent[attr]) || Array.isArray(parentContent[attr])) parentContent[attr] = {}
					this.applyKeyframeContent(parentContent[attr], value)
				}
			} else {
				parentContent[attr] = value
			}
		}
		toc()
	}
	private getActiveKeyframeInstances(
		keyframes: ResolvedTimelineObject[],
		time: Time
	): ResolvedTimelineObjectInstance[] {
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

			/* istanbul ignore next */
			return 0
		})
		return keyframeInstances
	}
}
