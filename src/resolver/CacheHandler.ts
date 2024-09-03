import { Reference, ResolvedTimelineObject, ResolvedTimelineObjects, ResolverCache } from '../api'
import { ResolvedTimelineHandler } from './ResolvedTimelineHandler'
import { mapToObject } from './lib/lib'
import { tic } from './lib/performance'
import { getRefLayer, getRefObjectId, isLayerReference, isObjectReference, joinReferences } from './lib/reference'
import { objHasLayer } from './lib/timeline'

export class CacheHandler {
	/** A Persistant store. This object contains data that is persisted between resolves. */
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

		// cache.canBeUsed will be set in this.persistData()
		cache.canBeUsed = false

		this.cache = cache as ResolverCache
	}
	private debug(...args: any[]) {
		if (this.resolvedTimeline.options.debug) console.log(...args)
	}
	public determineChangedObjects(): void {
		const toc = tic('  cache.determineChangedObjects')
		// Go through all new objects, and determine whether they have changed:
		const allNewObjects: { [objId: string]: true } = {}
		const changedReferences: { [reference: Reference]: true } = {}
		const addChangedObject = (obj: ResolvedTimelineObject) => {
			const references = this.getAllReferencesThisObjectAffects(obj)
			for (const ref of references) {
				changedReferences[ref] = true
			}
			if (objHasLayer(obj)) {
				changedReferences[`$${obj.layer}`] = true
			}
		}

		for (const obj of this.resolvedTimeline.objectsMap.values()) {
			const oldHash = this.cache.objHashes[obj.id]
			const newHash = hashTimelineObject(obj)
			allNewObjects[obj.id] = true

			if (!oldHash) this.debug(`Cache: Object "${obj.id}" is new`)
			else if (oldHash !== newHash) this.debug(`Cache: Object "${obj.id}" has changed`)
			if (
				// Object is new:
				!oldHash ||
				// Object has changed:
				oldHash !== newHash
			) {
				this.cache.objHashes[obj.id] = newHash
				addChangedObject(obj)

				const oldObj = this.cache.objects[obj.id]
				if (oldObj) addChangedObject(oldObj)
			} else {
				// No timing-affecting changes detected
				/* istanbul ignore if */
				if (!oldHash) this.debug(`Cache: Object "${obj.id}" is similar`)

				// Even though the timeline-properties hasn't changed,
				// the content (and other properties) might have:
				const oldObj = this.cache.objects[obj.id]

				/* istanbul ignore if */
				if (!oldObj) {
					console.error('oldHash', oldHash)
					console.error('ids', Object.keys(this.cache.objects))
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
					addChangedObject(obj)
				}
			}
			// At this point, all directly changed objects have been marked as changed.

			// Next step is to invalidate any indirectly affected objects, by gradually removing the invalidated ones from validObjects

			// Prepare validObjects:
			const validObjects: ResolvedTimelineObjects = {}
			for (const obj of this.resolvedTimeline.objectsMap.values()) {
				validObjects[obj.id] = obj
			}
			/** All references that depend on another reference (ie objects, class or layers): */
			const affectReferenceMap: { [ref: Reference]: Reference[] } = {}

			/** Map of which objects can be affected by any other object, per layer */
			const objectLayerMap: { [layer: string]: string[] } = {}

			for (const obj of this.resolvedTimeline.objectsMap.values()) {
				// Add everything that this object affects:
				const cachedObj = this.cache.objects[obj.id]
				let affectedReferences = this.getAllReferencesThisObjectAffects(obj)
				if (cachedObj) {
					affectedReferences = joinReferences(
						affectedReferences,
						this.getAllReferencesThisObjectAffects(cachedObj)
					)
				}
				for (let i = 0; i < affectedReferences.length; i++) {
					const ref = affectedReferences[i]
					const objRef: Reference = `#${obj.id}`
					if (ref !== objRef) {
						if (!affectReferenceMap[objRef]) affectReferenceMap[objRef] = []
						affectReferenceMap[objRef].push(ref)
					}
				}

				// Add everything that this object is affected by:
				if (changedReferences[`#${obj.id}`]) {
					// The object is directly said to have changed.
					// (No need to add it to affectReferenceMap, since it'll be easily invalidated anyway later)
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
							if (!objectLayerMap[cachedObj.layer]) objectLayerMap[cachedObj.layer] = []
							objectLayerMap[cachedObj.layer].push(obj.id)
						}

						for (let i = 0; i < dependOnReferences.length; i++) {
							const ref = dependOnReferences[i]
							if (!affectReferenceMap[ref]) affectReferenceMap[ref] = []
							affectReferenceMap[ref].push(`#${obj.id}`)
						}
					}
				}
			}

			// Invalidate all changed objects, and recursively invalidate all objects that reference those objects:
			const handledReferences: { [ref: Reference]: true } = {}
			for (const reference of Object.keys(changedReferences) as Reference[]) {
				this.invalidateObjectsWithReference(
					handledReferences,
					reference,
					affectReferenceMap,
					validObjects,
					objectLayerMap
				)
			}

			// At this point, the objects that are left in validObjects are still valid (ie has not changed or is affected by any others).
			// We can reuse the old resolving for those:
			for (const obj of Object.values<ResolvedTimelineObject>(validObjects)) {
				if (!this.cache.objects[obj.id])
					/* istanbul ignore next */
					throw new Error(
						`Something went wrong: "${obj.id}" does not exist in cache.resolvedTimeline.objects`
					)
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

	private getAllReferencesThisObjectAffects(newObj: ResolvedTimelineObject): Reference[] {
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

	/** Invalidate all changed objects, and recursively invalidate all objects that reference those objects */
	private invalidateObjectsWithReference(
		handledReferences: { [ref: Reference]: true },
		reference: Reference,
		affectReferenceMap: { [ref: Reference]: Reference[] },
		validObjects: ResolvedTimelineObjects,
		/** Map of which objects can be affected by any other object, per layer */
		objectLayerMap: { [layer: string]: string[] }
	) {
		if (handledReferences[reference]) return // to avoid infinite loops
		handledReferences[reference] = true

		if (isObjectReference(reference)) {
			const objId = getRefObjectId(reference)
			if (validObjects[objId]) {
				delete validObjects[objId]
			}
		}
		if (isLayerReference(reference)) {
			const layer = getRefLayer(reference)
			if (objectLayerMap[layer]) {
				for (const affectedObjId of objectLayerMap[layer]) {
					this.invalidateObjectsWithReference(
						handledReferences,
						`#${affectedObjId}`,
						affectReferenceMap,
						validObjects,
						objectLayerMap
					)
				}
			}
		}

		// Invalidate all objects that depend on any of the references that this reference affects:
		const affectedReferences = affectReferenceMap[reference]
		if (affectedReferences) {
			for (let i = 0; i < affectedReferences.length; i++) {
				const referencingReference = affectedReferences[i]
				this.invalidateObjectsWithReference(
					handledReferences,
					referencingReference,
					affectReferenceMap,
					validObjects,
					objectLayerMap
				)
			}
		}
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
