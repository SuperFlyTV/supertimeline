import { interpretExpression, wrapInnerExpressions, simplifyExpression, validateExpression, onCloseCleanup } from '..'

describe('Expression', () => {
	afterAll(() => {
		onCloseCleanup()
	})
	test('interpretExpression from string', () => {
		expect(interpretExpression('42.5')).toEqual(42.5)
		expect(interpretExpression('+42.5')).toEqual(42.5)
		expect(interpretExpression('-42.5')).toEqual(-42.5)

		expect(() => interpretExpression('45 +')).toThrow()

		expect(interpretExpression('1+2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2',
		})
		expect(interpretExpression('   1   *   2   ')).toMatchObject({
			l: '1',
			o: '*',
			r: '2',
		})

		expect(interpretExpression('1 + 2')).toMatchObject({
			l: '1',
			o: '+',
			r: '2',
		})
		expect(interpretExpression('1 - 2')).toMatchObject({
			l: '1',
			o: '-',
			r: '2',
		})
		expect(interpretExpression('1 * 2')).toMatchObject({
			l: '1',
			o: '*',
			r: '2',
		})
		expect(interpretExpression('1 / 2')).toMatchObject({
			l: '1',
			o: '/',
			r: '2',
		})
		expect(interpretExpression('1 % 2')).toMatchObject({
			l: '1',
			o: '%',
			r: '2',
		})
		expect(interpretExpression('1 + 2 * 3')).toMatchObject({
			l: '1',
			o: '+',
			r: {
				l: '2',
				o: '*',
				r: '3',
			},
		})
		expect(interpretExpression('1 * 2 + 3')).toMatchObject({
			l: {
				l: '1',
				o: '*',
				r: '2',
			},
			o: '+',
			r: '3',
		})
		expect(interpretExpression('1 * (2 + 3)')).toMatchObject({
			l: '1',
			o: '*',
			r: {
				l: '2',
				o: '+',
				r: '3',
			},
		})
		expect(interpretExpression('#first & #second')).toMatchObject({
			l: '#first',
			o: '&',
			r: '#second',
		})

		expect(interpretExpression('!thisOne')).toMatchObject({
			l: '',
			o: '!',
			r: 'thisOne',
		})

		expect(interpretExpression('!thisOne & !(that | !those)')).toMatchObject({
			l: {
				l: '',
				o: '!',
				r: 'thisOne',
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
						r: 'those',
					},
				},
			},
		})

		expect(interpretExpression('(!.classA | !$layer.classB) & #obj')).toMatchObject({
			l: {
				l: {
					l: '',
					o: '!',
					r: '.classA',
				},
				o: '|',
				r: {
					l: '',
					o: '!',
					r: '$layer.classB',
				},
			},
			o: '&',
			r: '#obj',
		})

		expect(interpretExpression('#obj.start')).toEqual('#obj.start')

		expect(interpretExpression(19.2)).toEqual(19.2)
		expect(interpretExpression(null)).toEqual(null)
	})
	test('wrapInnerExpressions', () => {
		expect(wrapInnerExpressions(['a', '(', 'b', 'c', ')'])).toEqual({ rest: [], inner: ['a', ['b', 'c']] })
		expect(wrapInnerExpressions(['a', '&', '!', 'b'])).toEqual({ rest: [], inner: ['a', '&', ['', '!', 'b']] })
	})
	test('simplifyExpression', () => {
		expect(simplifyExpression('1+2+3')).toEqual(6)

		expect(simplifyExpression('1+2*2+(4-2)')).toEqual(7)

		expect(simplifyExpression('10 / 2 + 1')).toEqual(6)

		expect(simplifyExpression('40+2+asdf')).toEqual({
			l: 42,
			o: '+',
			r: 'asdf',
		})

		expect(simplifyExpression('42 % 10')).toEqual(2)
		expect(simplifyExpression('42 % asdf')).toEqual({
			l: 42,
			o: '%',
			r: 'asdf',
		})

		// &: numbers can't really be combined:
		expect(simplifyExpression('5 & 1')).toEqual({
			l: 5,
			o: '&',
			r: 1,
		})
	})
	test('validateExpression', () => {
		expect(validateExpression(['+', '-'], '1+1')).toEqual(true)
		expect(validateExpression(['+', '-'], { l: 1, o: '+', r: 1 })).toEqual(true)

		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+' })).toThrow(/missing/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { o: '+', r: 1 })).toThrow(/missing/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: 12, r: 1 })).toThrow(/not a string/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, r: 1 })).toThrow(/missing/)

		expect(() => validateExpression(['+', '-'], { l: 1, o: '*', r: 1 })).toThrow(/not valid/)
		// @ts-ignore
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: [] })).toThrow(/invalid type/)

		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: { l: 1, o: '+', r: 1 } })).not.toThrow()
		expect(() => validateExpression(['+', '-'], { l: 1, o: '+', r: { l: 1, o: '*', r: 1 } })).toThrow(/not valid/)
		expect(() => validateExpression(['+', '-'], { r: 1, o: '+', l: { l: 1, o: '*', r: 1 } })).toThrow(/not valid/)
	})
	test('unknown operator', () => {
		let errString = ''
		try {
			interpretExpression('1 _ 2')
		} catch (e) {
			errString = `${e}`
		}
		expect(errString).toMatch(/operator not found/)
	})
})
