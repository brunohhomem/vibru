import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { defineConfig } from 'vitest/config';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL ausente: crie uma branch de teste no Neon (veja .env.example).',
  );
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@vibru\/shared(\/.*)?$/,
        replacement: path.join(projectDirectory, 'legacy/shared/src') + '$1',
      },
      { find: /^@\//, replacement: path.join(projectDirectory, 'src') + '/' },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    globalSetup: ['./src/db/test-global-setup.ts'],
    // Os testes apontam para a branch de teste; nunca para a production.
    env: {
      DATABASE_URL: testDatabaseUrl,
      BETTER_AUTH_SECRET: 'integration-test-secret-integration-test-secret',
      BETTER_AUTH_URL: 'http://localhost:3100',
    },
    // Os testes compartilham um banco só.
    fileParallelism: false,
  },
});
