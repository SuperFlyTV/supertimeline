import { TimelineObject } from '../../api'

export function objHasLayer(obj: TimelineObject): boolean {
	return obj.layer !== undefined && obj.layer !== '' && obj.layer !== null
}
