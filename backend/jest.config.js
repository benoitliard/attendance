module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Auto-mock the prisma module
  moduleNameMapper: {
    '^../lib/prisma$': '<rootDir>/src/lib/__mocks__/prisma.ts',
    '^./lib/prisma$': '<rootDir>/src/lib/__mocks__/prisma.ts',
  },
};
