import {
	ClassReference,
	InstanceId,
	InstanceReference,
	LayerReference,
	ObjectReference,
	ParentReference,
	Reference,
	TimelineObjectInstance,
} from '../../api'
import { compareStrings } from './lib'
import { tic } from './performance'

/*
 * References are strings that are added to instances,
 * to indicate what objects, layers or classes they are derived from.
 */

export function isObjectReference(ref: Reference): ref is ObjectReference {
	return ref.startsWith('#')
}
export function getRefObjectId(ref: ObjectReference): string {
	return ref.slice(1)
}
export function isParentReference(ref: Reference): ref is ParentReference {
	return ref == '##parent'
}

export function isClassReference(ref: Reference): ref is ClassReference {
	return ref.startsWith('.')
}
export function getRefClass(ref: ClassReference): string {
	return ref.slice(1)
}

export function isLayerReference(ref: Reference): ref is LayerReference {
	return ref.startsWith('$')
}
export function getRefLayer(ref: LayerReference): string {
	return ref.slice(1)
}

export function isInstanceReference(ref: Reference): ref is InstanceReference {
	return ref.startsWith('@')
}
export function getRefInstanceId(ref: InstanceReference): InstanceId {
	return ref.slice(1) as InstanceId
}

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

		for (const ref of references) {
			if (!refSet.has(ref)) {
				refSet.add(ref)
				resultingRefs.push(ref)
			}
		}

		for (const addReference of addReferences) {
			if (typeof addReference === 'string') {
				if (!refSet.has(addReference)) {
					refSet.add(addReference)
					resultingRefs.push(addReference)
				}
			} else {
				for (const ref of addReference) {
					if (!refSet.has(ref)) {
						refSet.add(ref)
						resultingRefs.push(ref)
					}
				}
			}
		}
	}
	resultingRefs.sort(compareStrings)
	toc()
	return resultingRefs
}

export function isReference(ref: ValueWithReference | TimelineObjectInstance[] | null): ref is ValueWithReference {
	return ref !== null && typeof (ref as any).value === 'number'
}
export interface ValueWithReference {
	value: number
	references: Reference[]
}
