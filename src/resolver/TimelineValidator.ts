import { TimelineEnable, TimelineKeyframe, TimelineObject } from '../api/timeline'
import { REGEXP_OPERATORS } from './ExpressionHandler'
import { ensureArray } from './lib/lib'
import { tic } from './lib/performance'

/** These characters are reserved and cannot be used in ids, etc */
const RESERVED_CHARACTERS = /[#.$]/g

/** These characters are reserved for possible future use and cannot be used in ids, etc */
const FUTURE_RESERVED_CHARACTERS = /[=?@{}[\]^§]/g

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
		timeline: TimelineObject[],
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

		try {
			this.validateId(obj, strict)
			this.validateLayer(obj, strict)
			this.validateContent(obj)
			this.validateEnable(obj, strict)

			if (obj.keyframes) {
				for (let i = 0; i < obj.keyframes.length; i++) {
					const keyframe = obj.keyframes[i]
					try {
						this.validateKeyframe(keyframe, strict)
					} catch (e) {
						throw new Error(`Keyframe[${i}]: ${e}`)
					}
				}
			}
			this.validateClasses(obj, strict)

			if (obj.children && !obj.isGroup) throw new Error(`Attribute "children" is set but "isGroup" is not`)
			if (obj.isGroup && !obj.children) throw new Error(`Attribute "isGroup" is set but "children" missing`)

			if (obj.children) {
				for (let i = 0; i < obj.children.length; i++) {
					const child = obj.children[i]
					try {
						this.validateObject(child, strict)
					} catch (e) {
						throw new Error(`Child[${i}]: ${e}`)
					}
				}
			}
			if (obj.priority !== undefined && typeof obj.priority !== 'number')
				throw new Error(`Attribute "priority" is not a number`)
		} catch (err) {
			if (err instanceof Error) {
				const err2 = new Error(`Object "${obj.id}": ${err.message}`)
				err2.stack = err.stack
				throw err
			} else throw err
		}
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

		try {
			this.validateId(keyframe, strict)
			this.validateContent(keyframe)
			this.validateEnable(keyframe, strict)
			this.validateClasses(keyframe, strict)
		} catch (err) {
			if (err instanceof Error) {
				const err2 = new Error(`Keyframe "${keyframe.id}": ${err.message}`)
				err2.stack = err.stack
				throw err
			} else throw err
		}
	}
	private validateId(obj: TimelineObject | TimelineKeyframe, strict: boolean | undefined): void {
		if (!obj.id) throw new Error(`Object missing "id" attribute`)
		if (typeof obj.id !== 'string') throw new Error(`Object "id" attribute is not a string: "${obj.id}"`)
		try {
			TimelineValidator.validateReferenceString(obj.id, strict)
		} catch (err) {
			throw new Error(`Object "id" attribute: ${err}`)
		}
		if (this.uniqueIds[obj.id]) throw new Error(`id "${obj.id}" is not unique`)
		this.uniqueIds[obj.id] = true
	}
	private validateLayer(obj: TimelineObject, strict: boolean | undefined): void {
		if (obj.layer === undefined)
			throw new Error(
				`"layer" attribute is undefined. (If an object is to have no layer, set this to an empty string.)`
			)
		try {
			TimelineValidator.validateReferenceString(`${obj.layer}`, strict)
		} catch (err) {
			throw new Error(`"layer" attribute: ${err}`)
		}
	}
	private validateContent(obj: TimelineObject | TimelineKeyframe): void {
		if (!obj.content) throw new Error(`"content" attribute must be set`)
	}
	private validateEnable(obj: TimelineObject | TimelineKeyframe, strict: boolean | undefined): void {
		if (!obj.enable) throw new Error(`"enable" attribute must be set`)

		const enables: TimelineEnable[] = ensureArray(obj.enable)
		for (let i = 0; i < enables.length; i++) {
			const enable = enables[i]

			if (enable.start !== undefined) {
				if (strict && enable.while !== undefined)
					throw new Error(`"enable.start" and "enable.while" cannot be combined`)

				if (strict && enable.end !== undefined && enable.duration !== undefined)
					throw new Error(`"enable.end" and "enable.duration" cannot be combined`)
			} else if (enable.while !== undefined) {
				if (strict && enable.end !== undefined)
					throw new Error(`"enable.while" and "enable.end" cannot be combined`)
				if (strict && enable.duration !== undefined)
					throw new Error(`"enable.while" and "enable.duration" cannot be combined`)
			} else throw new Error(`"enable.start" or "enable.while" must be set`)
		}
	}

	private validateClasses(obj: TimelineObject | TimelineKeyframe, strict: boolean | undefined): void {
		if (obj.classes) {
			for (let i = 0; i < obj.classes.length; i++) {
				const className = obj.classes[i]
				if (className && typeof className !== 'string') throw new Error(`"classes[${i}]" is not a string`)

				try {
					TimelineValidator.validateReferenceString(className, strict)
				} catch (err) {
					throw new Error(` "classes[${i}]": ${err}`)
				}
			}
		}
	}
	/**
	 * Validates a string that is used in Timeline as a reference (an id, a class or layer)
	 * @param str The string to validate
	 * @param strict Set to true to enable some strict rules (rules that can possibly be ignored)
	 */
	static validateReferenceString(str: string, strict?: boolean): void {
		if (!str) return

		const matchesOperators = REGEXP_OPERATORS.test(str)
		const matchesReserved = RESERVED_CHARACTERS.test(str)
		const matchesFutureReserved = strict && FUTURE_RESERVED_CHARACTERS.test(str)

		if (matchesOperators || matchesReserved || matchesFutureReserved) {
			const matchOperators: string[] = str.match(REGEXP_OPERATORS) ?? []
			const matchReserved: string[] = str.match(RESERVED_CHARACTERS) ?? []
			const matchFutureReserved: string[] = (strict && str.match(FUTURE_RESERVED_CHARACTERS)) || []
			throw new Error(
				`The string "${str}" contains characters which aren't allowed in Timeline: ${[
					matchOperators.length > 0 && `${matchOperators.map((o) => `"${o}"`).join(', ')} (is an operator)`,
					matchReserved.length > 0 &&
						`${matchReserved.map((o) => `"${o}"`).join(', ')} (is a reserved character)`,
					matchFutureReserved.length > 0 &&
						`${matchFutureReserved
							.map((o) => `"${o}"`)
							.join(', ')} (is a strict reserved character and might be used in the future)`,
				]
					.filter(Boolean)
					.join(', ')}`
			)
		}
	}
}
