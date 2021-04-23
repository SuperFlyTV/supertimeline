import { ResolvedTimelineObject, ResolverCache, ResolverCacheInternal, ResolvedTimeline } from '../api/api'

export function initializeCache(cacheOrg: ResolverCache, resolvedTimeline: ResolvedTimeline): ResolverCacheInternal {
	const cache = cacheOrg as ResolverCacheInternal

	if (!cache.objHashes) cache.objHashes = {}
	if (!cache.resolvedTimeline) cache.resolvedTimeline = resolvedTimeline

	// Todo: make statistics work when using cache

	return cache
}
/** Return a "hash-string" which changes whenever anything that affects timing of a timeline-object has changed. */
export function hashTimelineObject(obj: ResolvedTimelineObject): string {
	const thingsThatMatter: string[] = [
		JSON.stringify(obj.enable),
		obj.disabled + '',
		obj.priority + '',
		obj.resolved.parentId || '',
		obj.resolved.isKeyframe + '',
		obj.classes ? obj.classes.join('.') : '',
		obj.layer + '',
		obj.seamless + '',

		/*
		Note: The following properties are ignored, as they don't affect timing or resolving:
		 * id
		 * children
		 * keyframes
		 * isGroup
		 * content
		 */
	]
	return thingsThatMatter.join(',')
}
export function getObjectReferences(obj: ResolvedTimelineObject): string[] {
	return obj.resolved.directReferences
}
