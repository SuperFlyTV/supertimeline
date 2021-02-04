import {
	ResolvedTimelineObject,
	ResolverCache,
	ResolverCacheInternal,
	ResolvedTimeline
} from '../api/api'

export function initializeCache (cacheOrg: ResolverCache, resolvedTimeline: ResolvedTimeline): ResolverCacheInternal {
	const cache = cacheOrg as ResolverCacheInternal

	if (!cache.objHashes) cache.objHashes = {}
	if (!cache.resolvedTimeline) cache.resolvedTimeline = resolvedTimeline

	// Todo: make statistics work when using cache

	return cache
}
export function objectHash (obj: ResolvedTimelineObject): string {
	const thingsThatMatter: string[] = [
		JSON.stringify(obj.enable),
		obj.disabled + '',
		// obj.classes && obj.classes.join('_') || '',
		obj.priority + '' ,
		obj.resolved.parentId || '',
		obj.resolved.isKeyframe + '',
		obj.classes ? obj.classes.join('.') : '',
		obj.layer + ''
	]
	return thingsThatMatter.join(',')
}
export function getObjectReferences (obj: ResolvedTimelineObject) {
	return obj.resolved.directReferences
}
