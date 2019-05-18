import { interpretExpression, wrapInnerExpressions } from '../expression'

describe('Expression', () => {
	test('interpretExpression from string', () => {
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
})
