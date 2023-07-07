/** An Expression can be:
 * * An absolute value (number)
 * * An expression describing a relationship (string), like "#A.start + 10"
 * * An expression object, like {l: "#A.start", o: '+', r: '10'}
 */
export type Expression = number | string | ExpressionObj | null

export type ExpressionOperator = '+' | '-' | '*' | '/' | '&' | '|' | '!' | '%'
export interface ExpressionObj {
	l: Expression
	o: ExpressionOperator
	r: Expression
}
export interface InnerExpression {
	inner: Array<any> // string or Array<string>
	rest: Array<string>
}
