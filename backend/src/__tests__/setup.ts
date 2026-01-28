// Test setup with Prisma mock
// No real database needed - uses in-memory mock

// Set test environment variables FIRST
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.PORT = '3002';
process.env.NODE_ENV = 'test';

// Export reset function for tests that need it
export { resetMockData } from '../lib/__mocks__/prisma';

// Note: Don't auto-reset between tests - some test suites 
// have dependent tests that share state (e.g., auth tests)
// Each test file can import and call resetMockData() as needed
