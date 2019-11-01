import { interpretExpression, wrapInnerExpressions, simplifyExpression, validateExpression } from '../expression'

describe('Expression', () => {
	test('interpretExpression from string', () => {
		expect(interpretExpression('42.5')).toEqual(42.5)
		expect(interpretExpression('+42.5')).toEqual(42.5)
		expect(interpretExpression('-42.5')).toEqual(-42.5)

		expect(() => interpretExpression('45 +')).toThrowError()

		expect(interpretExpression('1+2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2'
		})
		expect(interpretExpression('   1   *   2   ')).toMatchObject({
			l: '1',
			o: '*',
			r: '2'
		})

		expect(interpretExpression('1 + 2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2'
		})
		expect(interpretExpression('1 - 2')).toMatchObject({
			l: '1',
			o: '-',
			r: '2'
		})
		expect(interpretExpression('1 * 2')).toMatchObject({
			l: '1',
			o: '*',
			r: '2'
		})
		expect(interpretExpression('1 / 2')).toMatchObject({
			l: '1',
			o: '/',
			r: '2'
		})
		expect(interpretExpression('1 % 2')).toMatchObject({
			l: '1',
			o: '%',
			r: '2'
		})
		expect(interpretExpression('1 + 2 * 3')).toMatchObject({
			l: '1',
			o: '+',
			r: {
				l: '2',
				o: '*',
				r: '3'
			}
		})
		expect(interpretExpression('1 * 2 + 3')).toMatchObject({
			l: {
				l: '1',
				o: '*',
				r: '2'
			},
			o: '+',
			r: '3'
		})
		expect(interpretExpression('1 * (2 + 3)')).toMatchObject({
			l: '1',
			o: '*',
			r: {
				l: '2',
				o: '+',
				r: '3'
			}
		})
		expect(interpretExpression('#first & #second')).toMatchObject({
			l: '#first',
			o: '&',
			r: '#second'
		})

		expect(interpretExpression('!thisOne')).toMatchObject({
			l: '',
			o: '!',
			r: 'thisOne'
		})

		expect(interpretExpression('!thisOne & !(that | !those)')).toMatchObject({
			l: {
				l: '',
				o: '!',
				r: 'thisOne'
			},
			o: '&',
			r: {
				l: '',
				o: '!',
				r: {
					l: 'that',
					o: '|',
					r: {
						l: '',
						o: '!',
						r: 'those'
					}
				}
			}
		})

		expect(interpretExpression('(!.classA | !$layer.classB) & #obj')).toMatchObject({
			'l': {
				'l': {
					'l': '',
					'o': '!',
					'r': '.classA'
				},
				'o': '|',
				'r': {
					'l': '',
					'o': '!',
					'r': '$layer.classB'
				}
			},
			'o': '&',
			'r': '#obj'
		})

		expect(interpretExpression('#obj.start')).toEqual('#obj.start')

		expect(interpretExpression(19.2)).toEqual(19.2)
		expect(interpretExpression(null)).toEqual(null)
	})
	test('wrapInnerExpressions', () => {
		expect(wrapInnerExpressions(
			['a', '(', 'b', 'c', ')']
		)).toEqual({rest: [], inner:
			['a', ['b', 'c']]
		})
		expect(wrapInnerExpressions(
			['a', '&', '!', 'b']
		)).toEqual({rest: [], inner:
			['a', '&', ['', '!', 'b']]
		})
	})
	test('simplifyExpression', () => {
		expect(simplifyExpression('1+2+3'
		)).toEqual(6)

		expect(simplifyExpression('1+2*2+(4-2)'
		)).toEqual(7)

		expect(simplifyExpression('10 / 2 + 1'
		)).toEqual(6)

		expect(simplifyExpression('40+2+asdf')).toEqual({
			l: 42,
			o: '+',
			r: 'asdf'
		})
	})
	test('validateExpression ', () => {
		expect(validateExpression(['+', '-'], '1+1')).toEqual(true)
		expect(validateExpression(['+', '-'], { l: 1, o: '+', r: 1 })).toEqual(true)

		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+' })).toThrowError(/missing/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { o: '+', r: 1 })).toThrowError(/missing/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: 12, r: 1 })).toThrowError(/not a string/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, r: 1 })).toThrowError(/missing/)

		expect(() => validateExpression(['+', '-'], { l: 1, o: '*', r: 1 })).toThrowError(/not valid/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: [] })).toThrowError(/invalid type/)

		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: { l: 1, o: '+', r: 1 } })).not.toThrowError()
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: { l: 1, o: '*', r: 1 } })).toThrowError(/not valid/)
		expect(() => validateExpression(['+', '-'], { r: 1, o: '+', l: { l: 1, o: '*', r: 1 } })).toThrowError(/not valid/)

	})
})
