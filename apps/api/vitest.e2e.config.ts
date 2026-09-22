import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // Same as vitest.config.ts: keep design:paramtypes so Nest DI works.
    swc.vite(
      {
        module: { type: 'es6' },
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      },
      { enforce: 'pre' },
    ),
  ],
  test: {
    include: ['test/**/*.e2e.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
});