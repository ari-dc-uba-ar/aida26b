import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/auth.test.ts', 'test/structure-adapter.test.ts'],
    pool: 'forks',
    fileParallelism: false,
  },
});
