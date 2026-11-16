/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: './src' } }],
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.service.ts', 'src/**/booking-policy.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
