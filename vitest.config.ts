import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'bin/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      'scaffold/',
      '**/node_modules/**',
    ],
    testTimeout: 30000, // 30 segundos timeout
    setupFiles: ['./test-setup.ts'], // Setup personalizado
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'scaffold/',
      ],
    },
  },
});
