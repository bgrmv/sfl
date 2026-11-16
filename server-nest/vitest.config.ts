import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild cannot emit decorator metadata, which Nest DI needs
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'), // Same as baseUrl imports like 'src/shared/...'
    },
  },
  test: {
    globals: true, // Use global `describe`, `it`, etc.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'], // Unit tests next to code, API tests in test/
    environment: 'node',
    silent: 'passed-only', // logs of passed tests (Nest, winston) only add noise
    hookTimeout: 120_000, // the first run downloads the mongod binary
    // Every API test file starts its own mongod and a whole Nest app: 16 files at once
    // took 3.4 GB. Three at a time keep the peak low, and the run only a little slower.
    maxWorkers: 3,

    exclude: [...configDefaults.exclude, 'e2e/**/*'], // Exclude e2e tests from this config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // Coverage reports in console and HTML format
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      reportsDirectory: '../coverage', // Specify directory for coverage reports
      // League calculation rules must stay covered (S2.3)
      thresholds: {
        'src/entities/games/games.service.ts': { lines: 80, branches: 80 },
      },
    },
  },
});
