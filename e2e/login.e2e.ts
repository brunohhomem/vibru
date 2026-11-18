import { expect, test } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e-um@example.com';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'senha-e2e-12345';
const GENERIC_ERROR = 'E-mail ou senha incorretos.';

test('visitante sem login que abre o /app cai no /login', async ({ page }) => {
  await page.goto('/app');

  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
});

test('senha errada mostra a mensagem genérica e continua no /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_EMAIL);
  await page.getByLabel('Senha').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('login com a senha certa chega no /app e continua logado ao recarregar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_EMAIL);
  await page.getByLabel('Senha').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL(/\/app$/);
  await page.reload();

  await expect(page).toHaveURL(/\/app$/);
});

test('o handler do Better Auth responde no /api/auth (sem cair na API legada)', async ({
  request,
}) => {
  const response = await request.get('/api/auth/ok');

  expect(response.status()).toBe(200);
});

test('cookie de sessão adulterado no /app volta para o /login sem loop nem erro', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'adulterado.abc', url: 'http://127.0.0.1:3100' },
  ]);

  await page.goto('/app');

  await expect(page).toHaveURL(/\/login/);
});
