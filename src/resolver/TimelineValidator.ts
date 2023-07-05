import { TimelineEnable, TimelineKeyframe, TimelineObject } from '../api/timeline'
import { REGEXP_OPERATORS } from './ExpressionHandler'
import { ensureArray } from './lib/lib'
import { tic } from './lib/performance'

/** These characters are reserved and cannot be used in ids, etc */
const RESERVED_CHARACTERS = /[#.$]/

/** These characters are reserved for possible future use and cannot be used in ids, etc */
const FUTURE_RESERVED_CHARACTERS = /[=?@{}[\]^§]/

/**
 * Note: A TimelineValidator instance is short-lived and used to validate a timeline.
 * Intended usage:
 * 1. const validator = new TimelineValidator()
 * 2. validator.validateTimeline(timeline)
 * or:
 * 1. const validator = new TimelineValidator()
 * 2. validator.validateObject(obj)
 * or:
 * 1. const validator = new TimelineValidator()
 * 2. validator.validateKeyframe(obj)
 */
export class TimelineValidator {
	private uniqueIds: { [id: string]: true } = {}

	/** Validates all objects in the timeline. Throws an error if something's wrong. */
	public validateTimeline(
		/** The timeline to validate */
		timeline: Array<TimelineObject>,
		/** Set to true to enable some optional strict rules. Set this to true to increase future compatibility. */
		strict?: boolean
	): void {
		const toc = tic('  validateTimeline')
		for (let i = 0; i < timeline.length; i++) {
			const obj = timeline[i]
			this.validateObject(obj, strict)
		}
		toc()
	}

	/** Validates a simgle Timeline-object. Throws an error if something's wrong. */
	public validateObject(
		/** The object to validate */
		obj: TimelineObject,
		/** Set to true to enable some optional strict rules. Set this to true to increase future compatibility. */
		strict?: boolean
	): void {
		if (!obj) throw new Error(`Object is undefined`)
		if (typeof obj !== 'object') throw new Error(`Object is not an object`)

		if (!obj.id) throw new Error(`Object missing "id" attribute`)
		if (typeof obj.id !== 'string') throw new Error(`Object "id" attribute is not a string: "${obj.id}"`)

		try {
			TimelineValidator.validateIdString(obj.id, strict)
		} catch (err) {
			throw new Error(`Object "id" attribute: ${err}`)
		}

		if (this.uniqueIds[obj.id]) throw new Error(`Object id "${obj.id}" is not unique`)
		this.uniqueIds[obj.id] = true

		if (obj.layer === undefined) throw new Error(`Object "${obj.id}": "layer" attribute is undefined`)

		try {
			TimelineValidator.validateIdString(`${obj.layer}`, strict)
		} catch (err) {
			throw new Error(`Object "${obj.id}": "layer" attribute: ${err}`)
		}

		if (!obj.content) throw new Error(`Object "${obj.id}": "content" attribute must be set`)
		if (!obj.enable) throw new Error(`Object "${obj.id}": "enable" attribute must be set`)

		const enables: TimelineEnable[] = ensureArray(obj.enable)
		for (let i = 0; i < enables.length; i++) {
			const enable = enables[i]

			if (enable.start !== undefined) {
				if (strict && enable.while !== undefined)
					throw new Error(`Object "${obj.id}": "enable.start" and "enable.while" cannot be combined`)

				if (strict && enable.end !== undefined && enable.duration !== undefined)
					throw new Error(`Object "${obj.id}": "enable.end" and "enable.duration" cannot be combined`)
			} else if (enable.while !== undefined) {
				if (strict && enable.end !== undefined)
					throw new Error(`Object "${obj.id}": "enable.while" and "enable.end" cannot be combined`)
				if (strict && enable.duration !== undefined)
					throw new Error(`Object "${obj.id}": "enable.while" and "enable.duration" cannot be combined`)
			} else throw new Error(`Object "${obj.id}": "enable.start" or "enable.while" must be set`)
		}
		if (obj.keyframes) {
			for (let i = 0; i < obj.keyframes.length; i++) {
				const keyframe = obj.keyframes[i]
				try {
					this.validateKeyframe(keyframe, strict)
				} catch (e) {
					throw new Error(`Object "${obj.id}" keyframe[${i}]: ${e}`)
				}
			}
		}
		if (obj.classes) {
			for (let i = 0; i < obj.classes.length; i++) {
				const className = obj.classes[i]
				if (className && typeof className !== 'string')
					throw new Error(`Object "${obj.id}": "classes[${i}]" is not a string`)

				try {
					TimelineValidator.validateIdString(className, strict)
				} catch (err) {
					throw new Error(`Object "${obj.id}": "classes[${i}]": ${err}`)
				}
			}
		}

		if (obj.children && !obj.isGroup)
			throw new Error(`Object "${obj.id}": attribute "children" is set but "isGroup" is not`)
		if (obj.isGroup && !obj.children)
			throw new Error(`Object "${obj.id}": attribute "isGroup" is set but "children" missing`)

		if (obj.children) {
			for (let i = 0; i < obj.children.length; i++) {
				const child = obj.children[i]
				try {
					this.validateObject(child, strict)
				} catch (e) {
					throw new Error(`Object "${obj.id}" child[${i}]: ${e}`)
				}
			}
		}
		if (obj.priority !== undefined && typeof obj.priority !== 'number')
			throw new Error(`Object "${obj.id}": attribute "priority" is not a number`)
	}
	/** Validates a simgle Timeline-object. Throws an error if something's wrong. */
	public validateKeyframe(
		/** The object to validate */
		keyframe: TimelineKeyframe,
		/** Set to true to enable some optional strict rules. Set this to true to increase future compatibility */
		strict?: boolean
	): void {
		if (!keyframe) throw new Error(`Keyframe is undefined`)
		if (typeof keyframe !== 'object') throw new Error(`Keyframe is not an object`)

		if (!keyframe.id) throw new Error(`Keyframe missing id attribute`)
		if (typeof keyframe.id !== 'string') throw new Error(`Keyframe id attribute is not a string: "${keyframe.id}"`)

		if (this.uniqueIds[keyframe.id]) throw new Error(`Keyframe id "${keyframe.id}" is not unique`)
		this.uniqueIds[keyframe.id] = true

		if (!keyframe.content) throw new Error(`Keyframe "${keyframe.id}": "content" attribute must be set`)
		if (!keyframe.enable) throw new Error(`Keyframe "${keyframe.id}": "enable" attribute must be set`)
		const enables: TimelineEnable[] = Array.isArray(keyframe.enable) ? keyframe.enable : [keyframe.enable]
		for (let i = 0; i < enables.length; i++) {
			const enable = enables[i]

			if (enable.start !== undefined) {
				if (strict && enable.while !== undefined)
					throw new Error(`Keyframe "${keyframe.id}": "enable.start" and "enable.while" cannot be combined`)

				if (strict && enable.end !== undefined && enable.duration !== undefined)
					throw new Error(`Keyframe "${keyframe.id}": "enable.end" and "enable.duration" cannot be combined`)
			} else if (enable.while !== undefined) {
				if (strict && enable.end !== undefined)
					throw new Error(`Keyframe "${keyframe.id}": "enable.while" and "enable.end" cannot be combined`)
				if (strict && enable.duration !== undefined)
					throw new Error(
						`Keyframe "${keyframe.id}": "enable.while" and "enable.duration" cannot be combined`
					)
			} else throw new Error(`Keyframe "${keyframe.id}": "enable.start" or "enable.while" must be set`)
		}
		if (keyframe.classes) {
			for (let i = 0; i < keyframe.classes.length; i++) {
				const className = keyframe.classes[i]
				if (className && typeof className !== 'string')
					throw new Error(`Keyframe "${keyframe.id}": "classes[${i}]" is not a string`)
			}
		}
	}
	/**
	 * Validates a string that is used in Timeline as a reference (an id, a class or layer)
	 * @param str The string to validate
	 * @param strict Set to true to enable some strict rules (rules that can possibly be ignored)
	 */
	static validateIdString(str: string, strict?: boolean): void {
		if (!str) return
		{
			const m = str.match(REGEXP_OPERATORS)
			if (m) {
				throw new Error(
					`The string "${str}" contains a character ("${m[1]}") which isn't allowed in Timeline (is an operator)`
				)
			}
		}
		{
			const m = str.match(RESERVED_CHARACTERS)
			if (m) {
				throw new Error(
					`The string "${str}" contains a character ("${m[1]}") which isn't allowed in Timeline (is a reserved character)`
				)
			}
		}
		if (strict) {
			// Also check a few characters that are technically allowed today, but *might* become used in future versions of Timeline:
			{
				const m = str.match(FUTURE_RESERVED_CHARACTERS)
				if (m) {
					throw new Error(
						`The string "${str}" contains a character ("${m[0]}") which isn't allowed in Timeline (is an reserved character and might be used in the future)`
					)
				}
			}
		}
	}
}
