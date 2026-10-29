import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

function readWorkspaceEmail(key: string, fallback: string): string {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;

  const envPath = path.resolve(__dirname, '../../.env');
  if (!existsSync(envPath)) return fallback;

  const prefix = `${key}=`;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const value = trimmed.slice(prefix.length).trim();
    if (value) return value;
  }

  return fallback;
}

const adminEmail = readWorkspaceEmail('ADMIN_EMAIL', 'admin@example.com');
const partnerEmail = readWorkspaceEmail('PARTNER_EMAIL', 'parceira@example.com');
process.env.E2E_ADMIN_EMAIL = adminEmail;
process.env.E2E_PARTNER_EMAIL = partnerEmail;

const sharedEnv = {
  ...process.env,
  DB_NAME: 'app_e2e',
  NODE_ENV: 'development',
  E2E_ADMIN_EMAIL: adminEmail,
  E2E_PARTNER_EMAIL: partnerEmail,
};

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
  webServer: [
    {
      command: 'node ../../packages/scripts/e2e-up.mjs',
      cwd: '.',
      url: 'http://127.0.0.1:3101/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: sharedEnv,
    },
    {
      command: 'node ./node_modules/next/dist/bin/next start --port 3100',
      cwd: '.',
      url: 'http://127.0.0.1:3100',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...sharedEnv,
        NODE_ENV: 'production',
        API_ORIGIN: process.env.API_ORIGIN ?? 'http://127.0.0.1:3101',
      },
    },
  ],
});
