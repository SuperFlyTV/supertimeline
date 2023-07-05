import { TimelineObjectInstance } from '../../api'
import { ValueWithReference } from '../ReferenceHandler'
import { InstanceId } from './instance'
import { tic } from './performance'

/*
 * References are strings that are added to instances,
 * to indicate what objects, layers or classes they are derived from.
 */

export type ObjectReference = `#${string}`
export function isObjectReference(ref: Reference): ref is ObjectReference {
	return ref.startsWith('#')
}
export function getRefObjectId(ref: ObjectReference): string {
	return ref.slice(1)
}

export type ClassReference = `.${string}`
export function isClassReference(ref: Reference): ref is ClassReference {
	return ref.startsWith('.')
}
export function getRefClass(ref: ClassReference): string {
	return ref.slice(1)
}

export type LayerReference = `$${string}`
export function isLayerReference(ref: Reference): ref is LayerReference {
	return ref.startsWith('$')
}
export function getRefLayer(ref: LayerReference): string {
	return ref.slice(1)
}

export type InstanceReference = `@${InstanceId}`
export function isInstanceReference(ref: Reference): ref is InstanceReference {
	return ref.startsWith('@')
}
export function getRefInstanceId(ref: InstanceReference): InstanceId {
	return ref.slice(1) as InstanceId
}

export type Reference = ObjectReference | ClassReference | LayerReference | InstanceReference

/** Add / join references Arrays. Returns a sorted list of unique references */
export function joinReferences(references: Reference[], ...addReferences: Array<Reference[] | Reference>): Reference[] {
	const toc = tic('     joinReferences')

	// Fast path: When nothing is added, return the original references:
	if (addReferences.length === 1 && typeof addReferences[0] !== 'string' && addReferences[0].length === 0) {
		return [...references]
	}

	let fastPath = false
	let resultingRefs: Reference[] = []

	// Fast path: When a single ref is added
	if (addReferences.length === 1 && typeof addReferences[0] === 'string') {
		if (references.includes(addReferences[0])) {
			// The value already exists, return the original references:
			return [...references]
		} else {
			// just quickly add the reference and jump forward to sorting of resultingRefs:
			resultingRefs = [...references]
			resultingRefs.push(addReferences[0])
			fastPath = true
		}
	}

	if (!fastPath) {
		const refSet = new Set<Reference>()

		for (let i = 0; i < references.length; i++) {
			const ref = references[i]

			if (!refSet.has(ref)) {
				refSet.add(ref)
				resultingRefs.push(ref)
			}
		}

		for (let i = 0; i < addReferences.length; i++) {
			const addReference = addReferences[i]

			if (typeof addReference === 'string') {
				if (!refSet.has(addReference)) {
					refSet.add(addReference)
					resultingRefs.push(addReference)
				}
			} else {
				for (let j = 0; j < addReference.length; j++) {
					const ref = addReference[j]

					if (!refSet.has(ref)) {
						refSet.add(ref)
						resultingRefs.push(ref)
					}
				}
			}
		}
	}
	resultingRefs = resultingRefs.sort((a, b) => {
		if (a > b) return 1
		if (a < b) return -1
		return 0
	})
	toc()
	return resultingRefs
}
export function isReference(ref: ValueWithReference | TimelineObjectInstance[] | null): ref is ValueWithReference {
	const v = ref !== null && typeof (ref as any).value === 'number'

	return v
}
