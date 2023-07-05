/** Returns true if an expression is a constant (ie doesn't reference something else) */
export function isConstantExpr(str: string | number | null | any): str is string | number {
	if (isNumericExpr(str)) return true
	if (typeof str === 'string') {
		const lStr = str.toLowerCase()
		if (lStr === 'true') return true
		if (lStr === 'false') return true
	}
	return false
}
export function isNumericExpr(str: string | number | null | any): boolean {
	if (str === null) return false
	if (typeof str === 'number') return true
	if (typeof str === 'string') return !!(str.match(/^[-+]?[0-9.]+$/) && !isNaN(parseFloat(str)))
	return false
}
