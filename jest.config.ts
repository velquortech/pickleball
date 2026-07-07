import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Load next.config.ts and .env files in the test environment
  dir: './',
})

const sharedConfig: Config = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^server-only$': '<rootDir>/__mocks__/server-only.ts',
  },
}

// Two projects: `unit` (jsdom) for components/hooks/utils,
// `integration` (node) for tests hitting the local Supabase stack.
const buildConfig = async (): Promise<Config> => {
  const unitConfig = await createJestConfig({
    ...sharedConfig,
    displayName: 'unit',
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  })()

  const integrationConfig = await createJestConfig({
    ...sharedConfig,
    displayName: 'integration',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
    testTimeout: 15000,
  })()

  return {
    coverageProvider: 'v8',
    projects: [unitConfig, integrationConfig],
  }
}

export default buildConfig
