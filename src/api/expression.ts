/** An Expression can be:
 * * An absolute value (number)
 * * An expression describing a relationship (string), like "#A.start + 10"
 * * An expression object, like {l: "#A.start", o: '+', r: '10'}
 */
export type Expression = number | string | ExpressionObj | null

export type ExpressionOperator = '+' | '-' | '*' | '/' | '&' | '|' | '!' | '%'

/** An ExpressionObj represents a mathematic expression. Eg. "1 + 2" === { l: "1", o: "+", r: "2"} */
export interface ExpressionObj {
	/** Left-side operand of the expression */
	l: Expression
	/** Operator of the expression */
	o: ExpressionOperator
	/** Right-side operand of the expression */
	r: Expression
}
export interface InnerExpression {
	inner: any[]
	rest: string[]
}
