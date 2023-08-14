import { Cap, TimelineObjectInstance } from '../../api'

export function joinCaps(...caps: Array<Cap[] | undefined>): Cap[] {
	const capMap: { [capReference: string]: Cap } = {}
	for (let i = 0; i < caps.length; i++) {
		const caps2 = caps[i]
		if (caps2) {
			for (let j = 0; j < caps2.length; j++) {
				const cap2 = caps2[j]
				capMap[cap2.id] = cap2
			}
		}
	}
	return Object.values<Cap>(capMap)
}
export function addCapsToResuming(instance: TimelineObjectInstance, ...caps: Array<Cap[] | undefined>): void {
	const capsToAdd: Cap[] = []
	const joinedCaps = joinCaps(...caps)
	for (let i = 0; i < joinedCaps.length; i++) {
		const cap = joinedCaps[i]

		if (cap.end !== null && instance.end !== null && cap.end > instance.end) {
			capsToAdd.push({
				id: cap.id,
				start: 0,
				end: cap.end,
			})
		}
	}
	instance.caps = joinCaps(instance.caps, capsToAdd)
}
