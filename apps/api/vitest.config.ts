import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // NestJS uses design:paramtypes for DI; esbuild (vitest's default) drops
    // decorator metadata, so guards/providers get undefined deps. Use SWC
    // which emits the metadata like tsc does ("nest build").
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
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});