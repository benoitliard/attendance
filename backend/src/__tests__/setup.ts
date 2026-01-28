// Test setup
// 
// These tests require a running PostgreSQL database.
// Set DATABASE_URL in .env or as environment variable before running tests.
// Example: DATABASE_URL="postgresql://user:pass@localhost:5432/attendance_test"
//
import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.PORT = '3002';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set. Integration tests will be skipped.');
    return;
  }
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore disconnect errors
  }
});
