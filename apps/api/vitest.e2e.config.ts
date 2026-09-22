import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
});