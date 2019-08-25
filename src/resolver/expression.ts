import _ = require('underscore')
import { Expression, ExpressionObj } from '../api/api'
import { isNumeric } from '../lib'

export const OPERATORS = ['&', '|', '+', '-', '*', '/', '%', '!']

export function interpretExpression (expr: null): null
export function interpretExpression (expr: number): number
export function interpretExpression (expr: ExpressionObj): ExpressionObj
export function interpretExpression (expr: string | Expression): Expression
export function interpretExpression (expr: Expression): Expression {
	if (isNumeric(expr)) {
		return parseFloat(expr as string)
	} else if (_.isString(expr)) {

		const operatorList = OPERATORS

		const regexpOperators = _.map(operatorList, o => '\\' + o).join('')

		expr = expr.replace(new RegExp('([' + regexpOperators + '\\(\\)])','g'),' $1 ') // Make sure there's a space between every operator & operand

		const words: Array<string> = _.compact(expr.split(' '))

		if (words.length === 0) return null // empty expression

		// Fix special case: a + - b
		for (let i = words.length - 2; i >= 1; i--) {
			if ((words[i] === '-' || words[i] === '+') && wordIsOperator(operatorList, words[i - 1])) {
				words[i] = words[i] + words[i + 1]
				words.splice(i + 1,1)
			}
		}
		const innerExpression = wrapInnerExpressions(words)
		if (innerExpression.rest.length) throw new Error('interpretExpression: syntax error: parentheses don\'t add up in "' + expr + '".')
		if (innerExpression.inner.length % 2 !== 1) throw new Error('interpretExpression: operands & operators don\'t add up: "' + innerExpression.inner.join(' ') + '".')

		const expression = words2Expression(operatorList, innerExpression.inner)
		validateExpression(operatorList, expression)
		return expression
	} else {
		return expr
	}
}
function wordIsOperator (operatorList: string[], word: string) {
	if (operatorList.indexOf(word) !== -1) return true
	return false
}
interface InnerExpression {
	inner: Array<any> // string or Array<string>
	rest: Array<string>
}
// Turns ['a', '(', 'b', 'c', ')'] into ['a', ['b', 'c']]
// or ['a', '&', '!', 'b'] into ['a', '&', ['', '!', 'b']]
export function wrapInnerExpressions (words: Array<any>): InnerExpression {
	for (let i = 0; i < words.length; i++) {

		if (words[i] === '(') {
			const tmp = wrapInnerExpressions(words.slice(i + 1))

			// insert inner expression and remove tha
			words[i] = tmp.inner
			words.splice(i + 1, 99999, ...tmp.rest)
		} else if (words[i] === ')') {
			return {
				inner: words.slice(0, i),
				rest: words.slice(i + 1)
			}
		} else if (words[i] === '!') {
			const tmp = wrapInnerExpressions(words.slice(i + 1))

			// insert inner expression after the '!'
			words[i] = ['', '!'].concat(tmp.inner)
			words.splice(i + 1, 99999, ...tmp.rest)
		}
	}
	return {
		inner: words,
		rest: []
	}
}
function words2Expression (operatorList: Array<string>, words: Array<any>): Expression {
	if (!words || !words.length) throw new Error('words2Expression: syntax error: unbalanced expression')
	while (words.length === 1 && _.isArray(words[0])) words = words[0]
	if (words.length === 1) return words[0]

	// Find the operator with the highest priority:
	let operatorI = -1
	_.each(operatorList,function (operator) {
		if (operatorI === -1) {
			operatorI = words.lastIndexOf(operator)
		}
	})

	if (operatorI !== -1) {
		const l = words.slice(0, operatorI)
		const r = words.slice(operatorI + 1)
		const expr: ExpressionObj = {
			l: words2Expression(operatorList, l),
			o: words[operatorI],
			r: words2Expression(operatorList, r)
		}

		return expr
	} else throw new Error('words2Expression: syntax error: operator not found: "' + (words.join(' ')) + '"')
}
function validateExpression (operatorList: Array<string>, expr0: Expression, breadcrumbs?: string) {
	if (!breadcrumbs) breadcrumbs = 'ROOT'

	if (_.isObject(expr0) && !_.isArray(expr0)) {
		const expr: ExpressionObj = expr0 as ExpressionObj

		if (!_.has(expr,'l')) throw new Error(`validateExpression: ${breadcrumbs}.l missing in ${JSON.stringify(expr)}`)
		if (!_.has(expr,'o')) throw new Error(`validateExpression: ${breadcrumbs}.o missing in ${JSON.stringify(expr)}`)
		if (!_.has(expr,'r')) throw new Error(`validateExpression: ${breadcrumbs}.r missing in ${JSON.stringify(expr)}`)

		if (!_.isString(expr.o)) throw new Error(`validateExpression: ${breadcrumbs}.o not a string`)

		if (!wordIsOperator(operatorList, expr.o)) throw new Error(breadcrumbs + '.o not valid: "' + expr.o + '"')

		validateExpression(operatorList, expr.l, breadcrumbs + '.l')
		validateExpression(operatorList, expr.r, breadcrumbs + '.r')
	} else if (!_.isNull(expr0) && !_.isString(expr0) && !_.isNumber(expr0)) {
		throw new Error(`validateExpression: ${breadcrumbs} is of invalid type`)
	}
}
