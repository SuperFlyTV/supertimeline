module.exports = {
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: true }],
	},
	testMatch: ['**/src/**/__tests__/**/*.spec.(ts|js)'],
	testEnvironment: 'node',
	coverageThreshold: {
		global: {
			branches: 0,
			functions: 0,
			lines: 0,
			statements: 0,
		},
	},
	coverageDirectory: './coverage/',
	collectCoverage: false,
	collectCoverageFrom: ['src/**/*.ts', '!**/__tests__/**'],
}
