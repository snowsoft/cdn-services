module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
        '!src/config/*.js',
        '!src/db/migrations/*.js',
        '!src/db/seeds/*.js',
    ],
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/',
    ],
    setupFilesAfterEnv: ['./tests/setup.js'],
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    verbose: true,
    testTimeout: 30000,
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
    },
    globals: {
        NODE_ENV: 'test',
    },
};