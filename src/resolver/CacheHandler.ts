import { Reference, ResolvedTimelineObject, ResolvedTimelineObjects, ResolverCache } from '../api'
import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { mapToObject } from './lib/lib'
import { tic } from './lib/performance'
import { getRefLayer, getRefObjectId, isLayerReference, isObjectReference, joinReferences } from './lib/reference'
import { objHasLayer } from './lib/timeline'

export class CacheHandler {
	/** A Persistent store. This object contains data that is persisted between resolves. */
	private cache: ResolverCache

	private canUseIncomingCache: boolean

	constructor(cache: Partial<ResolverCache>, private resolvedTimeline: ResolvedTimelineHandler) {
		if (!cache.objHashes) cache.objHashes = {}
		if (!cache.objects) cache.objects = {}

		if (!cache.canBeUsed) {
			// Reset the cache:
			cache.objHashes = {}
			cache.objects = {}

			this.canUseIncomingCache = false
		} else {
			this.canUseIncomingCache = true
		}

		if (this.resolvedTimeline.traceResolving) {
			this.resolvedTimeline.addResolveTrace(`cache: init`)
			this.resolvedTimeline.addResolveTrace(`cache: canUseIncomingCache: ${this.canUseIncomingCache}`)
			this.resolvedTimeline.addResolveTrace(
				`cache: cached objects: ${JSON.stringify(Object.keys(cache.objects))}`
			)
		}

		// cache.canBeUsed will be set in this.persistData()
		cache.canBeUsed = false

		this.cache = cache as ResolverCache
	}
	public determineChangedObjects(): void {
		const toc = tic('  cache.determineChangedObjects')
		// Go through all new objects, and determine whether they have changed:
		const allNewObjects: { [objId: string]: true } = {}

		const changedTracker = new ChangedTracker()

		for (const obj of this.resolvedTimeline.objectsMap.values()) {
			const oldHash = this.cache.objHashes[obj.id]
			const newHash = hashTimelineObject(obj)
			allNewObjects[obj.id] = true

			if (!oldHash) {
				if (this.resolvedTimeline.traceResolving) {
					this.resolvedTimeline.addResolveTrace(`cache: object "${obj.id}" is new`)
				}
			} else if (oldHash !== newHash) {
				if (this.resolvedTimeline.traceResolving) {
					this.resolvedTimeline.addResolveTrace(`cache: object "${obj.id}" has changed`)
				}
			}
			if (
				// Object is new:
				!oldHash ||
				// Object has changed:
				oldHash !== newHash
			) {
				this.cache.objHashes[obj.id] = newHash
				changedTracker.addChangedObject(obj)

				const oldObj = this.cache.objects[obj.id]
				if (oldObj) changedTracker.addChangedObject(oldObj)
			} else {
				// No timing-affecting changes detected
				/* istanbul ignore if */
				if (!oldHash) {
					if (this.resolvedTimeline.traceResolving) {
						this.resolvedTimeline.addResolveTrace(`cache: object "${obj.id}" is similar`)
					}
				}

				// Even though the timeline-properties hasn't changed,
				// the content (and other properties) might have:
				const oldObj = this.cache.objects[obj.id]

				/* istanbul ignore if */
				if (!oldObj) {
					console.error(`oldHash: "${oldHash}"`)
					console.error(`ids: ${JSON.stringify(Object.keys(this.cache.objects))}`)
					throw new Error(`Internal Error: obj "${obj.id}" not found in cache, even though hashes match!`)
				}

				this.cache.objects[obj.id] = {
					...obj,
					resolved: oldObj.resolved,
				}
			}
		}
		if (this.canUseIncomingCache) {
			// Go through all old hashes, removing the ones that doesn't exist anymore
			for (const objId in this.cache.objects) {
				if (!allNewObjects[objId]) {
					const obj = this.cache.objects[objId]
					delete this.cache.objHashes[objId]
					changedTracker.addChangedObject(obj)
				}
			}
			// At this point, all directly changed objects have been marked as changed.

			// Next step is to invalidate any indirectly affected objects, by gradually removing the invalidated ones from validObjects

			// Prepare the invalidator, ie populate it with the objects that are still valid:
			const invalidator = new Invalidator()
			for (const obj of this.resolvedTimeline.objectsMap.values()) {
				invalidator.addValidObject(obj)
			}

			for (const obj of this.resolvedTimeline.objectsMap.values()) {
				// Add everything that this object affects:
				const cachedObj = this.cache.objects[obj.id]
				let affectedReferences = getAllReferencesThisObjectAffects(obj)
				if (cachedObj) {
					affectedReferences = joinReferences(
						affectedReferences,
						getAllReferencesThisObjectAffects(cachedObj)
					)
				}
				for (let i = 0; i < affectedReferences.length; i++) {
					const ref = affectedReferences[i]
					const objRef: Reference = `#${obj.id}`
					if (ref !== objRef) {
						invalidator.addAffectedReference(objRef, ref)
					}
				}

				// Add everything that this object is affected by:
				if (changedTracker.isChanged(`#${obj.id}`)) {
					// The object is directly said to have changed.
				} else {
					// The object is not directly said to have changed.
					// But if might have been affected by other objects that have changed.

					// Note: we only have to check for the OLD object, since if the old and the new object differs,
					// that would mean it'll be directly invalidated anyway.
					if (cachedObj) {
						// Fetch all references for the object from the last time it was resolved.
						// Note: This can be done, since _if_ the object was changed in any way since last resolve
						// it'll be invalidated anyway
						const dependOnReferences = cachedObj.resolved.directReferences

						// Build up objectLayerMap:
						if (objHasLayer(cachedObj)) {
							invalidator.addObjectOnLayer(`${cachedObj.layer}`, obj)
						}

						for (let i = 0; i < dependOnReferences.length; i++) {
							const ref = dependOnReferences[i]
							invalidator.addAffectedReference(ref, `#${obj.id}`)
						}
					}
				}
			}

			// Invalidate all changed objects, and recursively invalidate all objects that reference those objects:
			for (const reference of changedTracker.listChanged()) {
				invalidator.invalidateObjectsWithReference(reference)
			}
			if (this.resolvedTimeline.traceResolving) {
				this.resolvedTimeline.addResolveTrace(
					`cache: changed references: ${JSON.stringify(Array.from(changedTracker.listChanged()))}`
				)
				this.resolvedTimeline.addResolveTrace(
					`cache: invalidated objects: ${JSON.stringify(Array.from(invalidator.getInValidObjectIds()))}`
				)
				this.resolvedTimeline.addResolveTrace(
					`cache: unchanged objects: ${JSON.stringify(invalidator.getValidObjects().map((o) => o.id))}`
				)
			}

			// At this point, the objects that are left in validObjects are still valid (ie has not changed or is affected by any others).
			// We can reuse the old resolving for those:
			for (const obj of invalidator.getValidObjects()) {
				if (!this.cache.objects[obj.id]) {
					/* istanbul ignore next */
					throw new Error(
						`Internal Error: Something went wrong: "${obj.id}" does not exist in cache.resolvedTimeline.objects`
					)
				}

				this.resolvedTimeline.objectsMap.set(obj.id, this.cache.objects[obj.id])
			}
		}
		toc()
	}

	public persistData(): void {
		const toc = tic('  cache.persistData')

		if (this.resolvedTimeline.resolveError) {
			// If there was a resolve error, clear the cache:
			this.cache.objHashes = {}
			this.cache.objects = {}
			this.cache.canBeUsed = false
		} else {
			this.cache.objects = mapToObject(this.resolvedTimeline.objectsMap)
			this.cache.canBeUsed = true
		}

		toc()
	}
}
/** Return a "hash-string" which changes whenever anything that affects timing of a timeline-object has changed. */
export function hashTimelineObject(obj: ResolvedTimelineObject): string {
	/*
	Note: The following properties are ignored, as they don't affect timing or resolving:
	 * id
	 * children
	 * keyframes
	 * isGroup
	 * content
	 */
	return `${JSON.stringify(obj.enable)},${+!!obj.disabled},${obj.priority}',${obj.resolved.parentId},${+obj.resolved
		.isKeyframe},${obj.classes ? obj.classes.join('.') : ''},${obj.layer},${+!!obj.seamless}`
}
function getAllReferencesThisObjectAffects(newObj: ResolvedTimelineObject): Reference[] {
	const references: Reference[] = [`#${newObj.id}`]

	if (newObj.classes) {
		for (const className of newObj.classes) {
			references.push(`.${className}`)
		}
	}
	if (objHasLayer(newObj)) references.push(`$${newObj.layer}`)

	if (newObj.children) {
		for (const child of newObj.children) {
			references.push(`#${child.id}`)
		}
	}
	return references
}
/**
 * Keeps track of which timeline object have been changed
 */
class ChangedTracker {
	private changedReferences = new Set<Reference>()

	/**
	 * Mark an object as "has changed".
	 * Will store all references that are affected by this object.
	 */
	public addChangedObject(obj: ResolvedTimelineObject) {
		for (const ref of getAllReferencesThisObjectAffects(obj)) {
			this.changedReferences.add(ref)
		}
	}
	/** Returns true if a reference has changed */
	public isChanged(ref: Reference): boolean {
		return this.changedReferences.has(ref)
	}
	/** Returns a list of all changed references */
	public listChanged(): IterableIterator<Reference> {
		return this.changedReferences.keys()
	}
}

/** The Invalidator  */
class Invalidator {
	private handledReferences: { [ref: Reference]: true } = {}
	/** All references that depend on another reference (ie objects, class or layers): */
	private affectReferenceMap: { [ref: Reference]: Reference[] } = {}
	private validObjects: ResolvedTimelineObjects = {}
	private inValidObjectIds: string[] = []
	/** Map of which objects can be affected by any other object, per layer */
	private objectLayerMap: { [layer: string]: string[] } = {}

	public addValidObject(obj: ResolvedTimelineObject) {
		this.validObjects[obj.id] = obj
	}
	public getValidObjects(): ResolvedTimelineObject[] {
		return Object.values<ResolvedTimelineObject>(this.validObjects)
	}
	public getInValidObjectIds(): string[] {
		return this.inValidObjectIds
	}
	public addObjectOnLayer(layer: string, obj: ResolvedTimelineObject) {
		if (!this.objectLayerMap[layer]) this.objectLayerMap[layer] = []
		this.objectLayerMap[layer].push(obj.id)
	}
	public addAffectedReference(objRef: Reference, ref: Reference) {
		if (!this.affectReferenceMap[objRef]) this.affectReferenceMap[objRef] = []
		this.affectReferenceMap[objRef].push(ref)
	}

	/** Invalidate all changed objects, and recursively invalidate all objects that reference those objects */
	public invalidateObjectsWithReference(reference: Reference) {
		if (this.handledReferences[reference]) return // to avoid infinite loops
		this.handledReferences[reference] = true

		if (isObjectReference(reference)) {
			const objId = getRefObjectId(reference)
			if (this.validObjects[objId]) {
				delete this.validObjects[objId]
				this.inValidObjectIds.push(objId)
			}
		}
		if (isLayerReference(reference)) {
			const layer = getRefLayer(reference)
			if (this.objectLayerMap[layer]) {
				for (const affectedObjId of this.objectLayerMap[layer]) {
					this.invalidateObjectsWithReference(`#${affectedObjId}`)
				}
			}
		}

		// Invalidate all objects that depend on any of the references that this reference affects:
		const affectedReferences = this.affectReferenceMap[reference]
		if (affectedReferences) {
			for (let i = 0; i < affectedReferences.length; i++) {
				const referencingReference = affectedReferences[i]
				this.invalidateObjectsWithReference(referencingReference)
			}
		}
	}
}
