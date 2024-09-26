import { ResolvedTimeline } from '../../api'

export class ResolveError extends Error {
	constructor(e: unknown, public readonly resolvedTimeline: ResolvedTimeline) {
		super(e instanceof Error ? e.message : `${e}`)

		this.name = 'ResolveError'
		if (e instanceof Error) {
			this.stack = e.stack
		}
	}
}
