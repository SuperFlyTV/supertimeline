import { interpretExpression } from '../expression'

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
	})
})
