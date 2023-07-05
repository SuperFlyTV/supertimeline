import { isNumericExpr } from '../expression'

describe('lib', () => {
	test('isNumeric', () => {
		expect(isNumericExpr('123')).toEqual(true)
		expect(isNumericExpr('123.234')).toEqual(true)
		expect(isNumericExpr('-23123.234')).toEqual(true)
		expect(isNumericExpr('123a')).toEqual(false)
		expect(isNumericExpr('123,1')).toEqual(false)
		expect(isNumericExpr('asdf')).toEqual(false)
	})
})
