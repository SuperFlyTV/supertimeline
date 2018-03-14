module.exports = {
	globals: {
		'ts-jest': {
			tsConfigFile: 'tsconfig.jest.json'
		}
	},
	moduleFileExtensions: [
		'ts',
		'js'
	],
	transform: {
		'^.+\\.(ts|tsx)$': './node_modules/ts-jest/preprocessor.js'
	},
	testMatch: [
		'**/__tests__/**/*.spec.(ts|js)'
	],
	testEnvironment: 'node',
	coverageThreshold: {
		global: {
		  statements: 90,
		  branches: 80,
		  functions: 95,
		  lines: 90
		}
	},
	coverageDirectory: "./coverage/",
	collectCoverage: true
}
