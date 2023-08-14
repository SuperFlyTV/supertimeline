import { ExpressionObj, Expression, InnerExpression, ExpressionOperator } from '../api/expression'
import { compact, isArray, isObject } from './lib/lib'
import { Cache } from './lib/cache'
import { isNumericExpr } from './lib/expression'

export const OPERATORS: ExpressionOperator[] = ['&', '|', '+', '-', '*', '/', '%', '!']

export const REGEXP_OPERATORS = new RegExp('([' + OPERATORS.map((o) => '\\' + o).join('') + '\\(\\)])', 'g')

export class ExpressionHandler {
	private cache: Cache

	constructor(autoClearCache?: boolean) {
		this.cache = new Cache(autoClearCache)
	}

	public interpretExpression(expression: null): null
	public interpretExpression(expression: number): number
	public interpretExpression(expression: ExpressionObj): ExpressionObj
	public interpretExpression(expression: string | Expression): Expression
	public interpretExpression(expression: Expression): Expression {
		if (isNumericExpr(expression)) {
			return parseFloat(expression as string)
		} else if (typeof expression === 'string') {
			const expressionString: string = expression
			return this.cache.cacheResult(
				expressionString,
				() => {
					const expr = expressionString.replace(REGEXP_OPERATORS, ' $1 ') // Make sure there's a space between every operator & operand

					const words: Array<string> = compact(expr.split(' '))

					if (words.length === 0) return null // empty expression

					// Fix special case: a + - b
					for (let i = words.length - 2; i >= 1; i--) {
						if ((words[i] === '-' || words[i] === '+') && wordIsOperator(OPERATORS, words[i - 1])) {
							words[i] = words[i] + words[i + 1]
							words.splice(i + 1, 1)
						}
					}

					const innerExpression = this.wrapInnerExpressions(words)
					if (innerExpression.rest.length)
						throw new Error(`interpretExpression: syntax error: parentheses don't add up in "${expr}".`)
					if (innerExpression.inner.length % 2 !== 1) {
						throw new Error(
							`interpretExpression: operands & operators don't add up: "${innerExpression.inner.join(
								' '
							)}".`
						)
					}

					const expression = this.words2Expression(OPERATORS, innerExpression.inner)
					this.validateExpression(OPERATORS, expression)
					return expression
				},
				60 * 60 * 1000 // 1 hour
			)
		} else {
			return expression
		}
	}
	/** Try to simplify an expression, this includes:
	 * * Combine constant operands, using arithmetic operators
	 * ...more to come?
	 */
	public simplifyExpression(expr0: Expression): Expression {
		const expr = typeof expr0 === 'string' ? this.interpretExpression(expr0) : expr0
		if (!expr) return expr

		if (isExpressionObject(expr)) {
			const l = this.simplifyExpression(expr.l)
			const o = expr.o
			const r = this.simplifyExpression(expr.r)

			if (typeof l === 'number' && typeof r === 'number') {
				// The operands can be combined:
				switch (o) {
					case '+':
						return l + r
					case '-':
						return l - r
					case '*':
						return l * r
					case '/':
						return l / r
					case '%':
						return l % r
					default:
						return { l, o, r }
				}
			}
			return { l, o, r }
		}
		return expr
	}

	// Turns ['a', '(', 'b', 'c', ')'] into ['a', ['b', 'c']]
	// or ['a', '&', '!', 'b'] into ['a', '&', ['', '!', 'b']]
	public wrapInnerExpressions(words: Array<any>): InnerExpression {
		for (let i = 0; i < words.length; i++) {
			if (words[i] === '(') {
				const tmp = this.wrapInnerExpressions(words.slice(i + 1))

				// insert inner expression and remove tha
				words[i] = tmp.inner
				words.splice(i + 1, 99999, ...tmp.rest)
			} else if (words[i] === ')') {
				return {
					inner: words.slice(0, i),
					rest: words.slice(i + 1),
				}
			} else if (words[i] === '!') {
				const tmp = this.wrapInnerExpressions(words.slice(i + 1))

				// insert inner expression after the '!'
				words[i] = ['', '!'].concat(tmp.inner)
				words.splice(i + 1, 99999, ...tmp.rest)
			}
		}
		return {
			inner: words,
			rest: [],
		}
	}

	/** Validates an expression. Returns true on success, throws error if not */
	public validateExpression(operatorList: Array<string>, expr0: Expression, breadcrumbs?: string): true {
		if (!breadcrumbs) breadcrumbs = 'ROOT'

		if (isObject(expr0) && !isArray(expr0)) {
			const expr: ExpressionObj = expr0

			if (expr.l === undefined)
				throw new Error(`validateExpression: ${breadcrumbs}.l missing in ${JSON.stringify(expr)}`)
			if (expr.o === undefined)
				throw new Error(`validateExpression: ${breadcrumbs}.o missing in ${JSON.stringify(expr)}`)
			if (expr.r === undefined)
				throw new Error(`validateExpression: ${breadcrumbs}.r missing in ${JSON.stringify(expr)}`)

			if (typeof expr.o !== 'string') throw new Error(`validateExpression: ${breadcrumbs}.o not a string`)

			if (!wordIsOperator(operatorList, expr.o)) throw new Error(breadcrumbs + '.o not valid: "' + expr.o + '"')

			return (
				this.validateExpression(operatorList, expr.l, breadcrumbs + '.l') &&
				this.validateExpression(operatorList, expr.r, breadcrumbs + '.r')
			)
		} else if (expr0 !== null && typeof expr0 !== 'string' && typeof expr0 !== 'number') {
			throw new Error(`validateExpression: ${breadcrumbs} is of invalid type`)
		}
		return true
	}

	public clearCache(): void {
		this.cache.clear()
	}
	private words2Expression(operatorList: Array<string>, words: Array<any>): Expression {
		/* istanbul ignore if */
		if (!words?.length) throw new Error('words2Expression: syntax error: unbalanced expression')
		while (words.length === 1 && words[0] !== null && isArray(words[0])) words = words[0]
		if (words.length === 1) return words[0]

		// Find the operator with the highest priority:
		let operatorI = -1
		for (let i = 0; i < operatorList.length; i++) {
			const operator = operatorList[i]

			if (operatorI === -1) {
				operatorI = words.lastIndexOf(operator)
			}
		}

		if (operatorI !== -1) {
			const l = words.slice(0, operatorI)
			const r = words.slice(operatorI + 1)
			const expr: ExpressionObj = {
				l: this.words2Expression(operatorList, l),
				o: words[operatorI],
				r: this.words2Expression(operatorList, r),
			}

			return expr
		} else throw new Error('words2Expression: syntax error: operator not found: "' + words.join(' ') + '"')
	}
}

function isExpressionObject(expr: Expression): expr is ExpressionObj {
	return (
		typeof expr === 'object' &&
		expr !== null &&
		expr.l !== undefined &&
		expr.o !== undefined &&
		expr.r !== undefined
	)
}
function wordIsOperator(operatorList: string[], word: string) {
	if (operatorList.indexOf(word) !== -1) return true
	return false
}
