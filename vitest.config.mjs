import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: path.join(projectDirectory, 'src') + '/' }],
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**'],
  },
});
