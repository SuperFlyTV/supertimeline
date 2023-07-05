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
