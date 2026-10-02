import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resuelvo los alias de tsconfig.json, incluidos los que genera Nest CLI.
  resolve: { tsconfigPaths: true },
  oxc: false,
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
