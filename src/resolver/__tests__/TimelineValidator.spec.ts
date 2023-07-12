import { TimelineValidator } from '../TimelineValidator'

test('validateReferenceString', () => {
	// Happy path:
	expect(() => TimelineValidator.validateReferenceString('asdf123456789')).not.toThrow()
	expect(() => TimelineValidator.validateReferenceString('asdfABC_2')).not.toThrow()

	// Contains operands:
	expect(() => TimelineValidator.validateReferenceString('abc+1')).toThrow(
		/contains characters which aren't allowed in Timeline: "\+" \(is an operator\)/
	)
	expect(() => TimelineValidator.validateReferenceString('abc-1')).toThrow(
		/contains characters which aren't allowed in Timeline: "-" \(is an operator\)/
	)
	expect(() => TimelineValidator.validateReferenceString('abc-1+1')).toThrow(
		/contains characters which aren't allowed in Timeline: "-", "\+" \(is an operator\)/
	)

	// Contains reserved characters:
	expect(() => TimelineValidator.validateReferenceString('abc#')).toThrow(
		/contains characters which aren't allowed in Timeline: "#" \(is a reserved character\)/
	)
	expect(() => TimelineValidator.validateReferenceString('abc$')).toThrow(
		/contains characters which aren't allowed in Timeline: "\$" \(is a reserved character\)/
	)
	expect(() => TimelineValidator.validateReferenceString('abc.2')).toThrow(
		/contains characters which aren't allowed in Timeline: "\." \(is a reserved character\)/
	)
	expect(() => TimelineValidator.validateReferenceString('abc#2.4')).toThrow(
		/contains characters which aren't allowed in Timeline: "#", "\." \(is a reserved character\)/
	)

	// Contains reserved future characters:
	expect(() => TimelineValidator.validateReferenceString('abc?')).not.toThrow()
	expect(() => TimelineValidator.validateReferenceString('abc=')).not.toThrow()
	expect(() => TimelineValidator.validateReferenceString('abc§')).not.toThrow()

	// Contains reserved future characters (strict):
	expect(() => TimelineValidator.validateReferenceString('abc?', true)).toThrow(
		/contains characters which aren't allowed in Timeline: "\?" \(is a strict reserved character/
	)
	expect(() => TimelineValidator.validateReferenceString('abc=', true)).toThrow(
		/contains characters which aren't allowed in Timeline: "=" \(is a strict reserved character/
	)
	expect(() => TimelineValidator.validateReferenceString('abc§', true)).toThrow(
		/contains characters which aren't allowed in Timeline: "§" \(is a strict reserved character/
	)
	expect(() => TimelineValidator.validateReferenceString('abc§=4', true)).toThrow(
		/contains characters which aren't allowed in Timeline: "§", "=" \(is a strict reserved character/
	)

	// Multiple issues:
	expect(() => TimelineValidator.validateReferenceString('abc§=4-1', true)).toThrow(
		/contains characters which aren't allowed in Timeline: "-" \(is an operator\), "§", "=" \(is a strict reserved character/
	)
})
