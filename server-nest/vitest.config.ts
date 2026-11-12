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
    include: ['src/**/*.test.ts'], // Specify test file pattern
    environment: 'node',

    exclude: [...configDefaults.exclude, 'e2e/**/*'], // Exclude e2e tests from this config
    coverage: {
      reporter: ['text', 'html'], // Coverage reports in console and HTML format
      // provider: 'c8',                   // Use c8 for coverage
      // reporter: ['text', 'html'],       // Coverage report formats
      include: ['**/*.(t|j)s'], // Collect coverage from TypeScript and JavaScript files
      reportsDirectory: '../coverage', // Specify directory for coverage reports
    },
    alias: {
      '@': '/src', // Set up @ as a shortcut for src folder
    },
  },
});
