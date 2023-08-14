import { isConstantExpr, isNumericExpr } from '../expression'

describe('lib', () => {
	test('isConstantExpr', () => {
		expect(isConstantExpr('1')).toEqual(true)
		expect(isConstantExpr('0')).toEqual(true)
		expect(isConstantExpr('true')).toEqual(true)
		expect(isConstantExpr('false')).toEqual(true)
		expect(isConstantExpr('asdf')).toEqual(false)
		expect(isConstantExpr('.asdf')).toEqual(false)
	})
	test('isNumeric', () => {
		expect(isNumericExpr('123')).toEqual(true)
		expect(isNumericExpr('123.234')).toEqual(true)
		expect(isNumericExpr('-23123.234')).toEqual(true)
		expect(isNumericExpr('123a')).toEqual(false)
		expect(isNumericExpr('123,1')).toEqual(false)
		expect(isNumericExpr('asdf')).toEqual(false)
	})
})
