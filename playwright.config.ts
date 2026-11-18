import 'dotenv/config';
import { defineConfig } from '@playwright/test';

const e2eEmail = process.env.E2E_USER_EMAIL ?? 'e2e-um@example.com';
const e2ePassword = process.env.E2E_USER_PASSWORD ?? 'senha-e2e-12345';

// O build de produção sobe contra a branch de TESTE do Neon, nunca a production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL ausente: o e2e não roda contra a production.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'pnpm db:seed && pnpm start',
    url: 'http://127.0.0.1:3100/login',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      BETTER_AUTH_URL: 'http://127.0.0.1:3100',
      NODE_ENV: 'production',
      SEED_USER_ONE_EMAIL: e2eEmail,
      SEED_USER_ONE_PASSWORD: e2ePassword,
      SEED_USER_TWO_EMAIL: 'e2e-dois@example.com',
      SEED_USER_TWO_PASSWORD: 'senha-e2e-dois-12345',
    },
  },
});
