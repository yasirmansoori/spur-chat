module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  setupFilesAfterEnv: [],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
