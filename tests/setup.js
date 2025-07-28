// Test setup file - runs before all tests
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000);

// Mock console methods in test to reduce noise
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}

// Global test utilities
global.testUtils = {
    // Generate random email
    randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,

    // Generate random string
    randomString: (length = 10) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Wait utility
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    // Create test user
    createTestUser: async (overrides = {}) => {
        const userData = {
            name: 'Test User',
            email: global.testUtils.randomEmail(),
            password: 'testPassword123',
            ...overrides,
        };
        // Implementation depends on your user service
        return userData;
    },
};

// Clean up function
global.cleanupTest = async () => {
    // Close database connections
    const db = require('../src/db');
    if (db && typeof db.destroy === 'function') {
        await db.destroy();
    }

    // Close Redis connections
    const redis = require('../src/redis');
    if (redis && typeof redis.quit === 'function') {
        await redis.quit();
    }
};

// Ensure cleanup after all tests
afterAll(async () => {
    await global.cleanupTest();
});