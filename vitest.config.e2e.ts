import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';


try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
