import { ResolvedTimeline, ResolvedTimelineObject } from '../api/api'
import * as _ from 'underscore'

export function addObjectToResolvedTimeline (resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject) {
	resolvedTimeline.objects[obj.id] = obj

	if (obj.classes) {
		_.each(obj.classes, (className: string) => {
			if (className) {
				if (!resolvedTimeline.classes[className]) resolvedTimeline.classes[className] = []
				resolvedTimeline.classes[className].push(obj.id)
			}
		})
	}
	if (obj.layer) {
		if (!resolvedTimeline.layers[obj.layer]) resolvedTimeline.layers[obj.layer] = []
		resolvedTimeline.layers[obj.layer].push(obj.id)
	}
}
