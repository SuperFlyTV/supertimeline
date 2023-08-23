import { assertNever } from './lib'
import { ValueWithReference, joinReferences } from './reference'

export type OperatorFunction = (a: ValueWithReference | null, b: ValueWithReference | null) => ValueWithReference | null

/** Helper class for various math operators, used in expressions */
export abstract class Operator {
	static get(operator: '+' | '-' | '*' | '/' | '%'): OperatorFunction {
		switch (operator) {
			case '+':
				return Operator.Add
			case '-':
				return Operator.Subtract
			case '*':
				return Operator.Multiply
			case '/':
				return Operator.Divide
			case '%':
				return Operator.Modulo
			default: {
				/* istanbul ignore next */
				assertNever(operator)
				/* istanbul ignore next */
				return Operator.Null
			}
		}
	}

	private static Add = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value + b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Subtract = (
		a: ValueWithReference | null,
		b: ValueWithReference | null
	): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value - b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Multiply = (
		a: ValueWithReference | null,
		b: ValueWithReference | null
	): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value * b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Divide = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value / b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Modulo = (a: ValueWithReference | null, b: ValueWithReference | null): ValueWithReference | null => {
		if (a === null || b === null) return null
		return {
			value: a.value % b.value,
			references: joinReferences(a.references, b.references),
		}
	}
	private static Null = (): ValueWithReference | null => {
		return null
	}
}
