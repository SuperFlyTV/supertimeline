import { ResolvedTimeline, ResolvedTimelineObject } from '../api/api'

export function addObjectToResolvedTimeline (resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject) {
	resolvedTimeline.objects[obj.id] = obj

	if (obj.classes) {
		for (let i = 0; i < obj.classes.length; i++) {
			const className: string = obj.classes[i]

			if (className) {
				if (!resolvedTimeline.classes[className]) resolvedTimeline.classes[className] = []
				resolvedTimeline.classes[className].push(obj.id)
			}
		}
	}
	if (obj.layer) {
		if (!resolvedTimeline.layers[obj.layer]) resolvedTimeline.layers[obj.layer] = []
		resolvedTimeline.layers[obj.layer].push(obj.id)
	}
}
