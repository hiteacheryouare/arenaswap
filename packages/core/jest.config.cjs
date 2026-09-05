// Pinned here rather than in the setup file: Jest hands each test file a copy of `process`, so an
// assignment made from inside the sandbox never reaches the setter Node uses to invalidate V8's
// cached zone. The config is read in the real process, before any worker is forked.
process.env.TZ = 'UTC';

const commonProjectConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^powerscore$': '<rootDir>/../powerscore/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: false },
          target: 'es2020',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jestSetup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};

module.exports = {
  projects: [
    {
      ...commonProjectConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    },
    {
      ...commonProjectConfig,
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts', '<rootDir>/tests/e2e/**/*.e2e.spec.ts'],
    },
  ],
};
