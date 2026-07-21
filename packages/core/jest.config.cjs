const commonProjectConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^powerscore$': '<rootDir>/../powerscore/src/index.ts',
  },
  // TODO: revert to ts-jest once it supports TypeScript 7
  // Replace this block with: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }] }
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
