import { expect, test, type Page } from '@playwright/test';

const INITIAL_PASSWORD = 'Admin@12345';
const NEXT_PASSWORD = 'NovaSenha456';
const NEW_DISPLAY_NAME = 'Bruno E2E';

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test('admin entra, vê a home do casal, navega e salva o próprio nome', async ({ page }) => {
  test.setTimeout(90_000);
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(adminEmail);
  await page.getByLabel('Senha').fill(INITIAL_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL(/\/change-password$/);
  await page.getByLabel('Senha atual').fill(INITIAL_PASSWORD);
  await page.getByLabel('Nova senha').fill(NEXT_PASSWORD);
  await page.getByRole('button', { name: 'Alterar senha' }).click();

  await page.waitForURL(/\/app$/);
  await expect(page.getByText('Casados há')).toBeVisible();
  await expectNoHorizontalScroll(page);

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await bottomNav.getByRole('link', { name: 'Tarefas' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();
  await expect(page.getByText('Chega numa próxima fase')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: 'Abrir menu do casal' }).click();
  await page.getByRole('menuitem', { name: 'Configurações do casal' }).click();
  await page.waitForURL(/\/app\/couple$/);
  await expectNoHorizontalScroll(page);

  await page.getByLabel('Meu nome no casal').fill(NEW_DISPLAY_NAME);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Configurações do casal salvas')).toBeVisible();

  await page.getByRole('button', { name: 'Abrir menu do casal' }).click();
  await expect(page.getByText(`${NEW_DISPLAY_NAME} e Parceira`)).toBeVisible();
});
