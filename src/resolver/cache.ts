import {
	ResolvedTimelineObject,
	ResolverCache,
	ResolverCacheInternal,
	ResolvedTimeline
} from '../api/api'
import * as crypto from 'crypto'
import * as _ from 'underscore'

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

	return crypto.createHash('md5').update(thingsThatMatter.join(',')).digest('hex')
}
export function getObjectReferences (obj: ResolvedTimelineObject) {
	return obj.resolved.directReferences

	// const references: string[] = []
	// _.each(obj.resolved.instances, instance => {
	// 	instance.references.forEach(ref => references.push(ref))
	// })
	// return references
}
