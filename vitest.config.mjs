import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Ponte temporária até a Fase 2: o contrato compartilhado ainda mora em legacy/shared.
      {
        find: /^@vibru\/shared(\/.*)?$/,
        replacement: path.join(projectDirectory, 'legacy/shared/src') + '$1',
      },
      { find: /^@\//, replacement: path.join(projectDirectory, 'src') + '/' },
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['legacy/**', 'node_modules/**', 'e2e/**', '**/*.integration.spec.ts'],
  },
});
