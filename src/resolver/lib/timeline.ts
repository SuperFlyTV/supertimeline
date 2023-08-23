import { TimelineObject } from '../../api'

/**
 * Returns true if object has a layer.
 * Note: Objects without a layer are called "transparent objects",
 * and won't be present in the resolved state.
 */
export function objHasLayer(obj: TimelineObject): boolean {
	return obj.layer !== undefined && obj.layer !== '' && obj.layer !== null
}
