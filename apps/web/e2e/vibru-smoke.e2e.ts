import { expect, test, type Page } from '@playwright/test';

const INITIAL_PASSWORD = 'Admin@12345';
const NEXT_PASSWORD = 'NovaSenha456';
const NEW_DISPLAY_NAME = 'Bruno E2E';
const TASK_TITLE = 'Comprar pão';
const LIST_TITLE = 'Mercado da semana';
const FIRST_ITEM = 'Café';
const SECOND_ITEM = 'Pão';

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
  await expect(page.getByText('Nenhuma tarefa aberta')).toBeVisible();
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

test('parceira cria tarefa para hoje, conclui, desfaz e a home conta para o Bruno', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const partnerEmail = process.env.E2E_PARTNER_EMAIL ?? 'parceira@example.com';

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(partnerEmail);
  await page.getByLabel('Senha').fill(INITIAL_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app$/);

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await bottomNav.getByRole('link', { name: 'Tarefas' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('Título').fill(TASK_TITLE);
  await page.getByRole('radio', { name: new RegExp(NEW_DISPLAY_NAME) }).click();
  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Tarefa criada')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Hoje' }).getByText(TASK_TITLE)).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: `Concluir ${TASK_TITLE}` }).click();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('region', { name: 'Hoje' }).getByText(TASK_TITLE)).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: 'Abrir menu do casal' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await page.waitForURL(/\/login$/);

  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  await page.getByLabel('E-mail').fill(adminEmail);
  await page.getByLabel('Senha').fill(NEXT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app$/);

  const brunoTile = page.getByRole('link', { name: new RegExp(NEW_DISPLAY_NAME) });
  await expect(brunoTile.getByText('1 tarefa hoje')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await brunoTile.click();
  await page.waitForURL(/\/app\/tasks\?de=/);
  await expect(page.getByRole('button', { name: NEW_DISPLAY_NAME, pressed: true })).toBeVisible();
  await expect(page.getByText(TASK_TITLE)).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('admin cria lista, marca itens e acompanha o progresso na home', async ({ page }) => {
  test.setTimeout(120_000);
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(adminEmail);
  await page.getByLabel('Senha').fill(NEXT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app$/);

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await bottomNav.getByRole('link', { name: 'Listas' }).click();
  await expect(page.getByRole('heading', { name: 'Listas' })).toBeVisible();
  await expect(page.getByText('Nenhuma lista ainda')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: 'Nova lista' }).click();
  await page.getByLabel('Nome').fill(LIST_TITLE);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Lista criada')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(LIST_TITLE) }).click();
  await page.waitForURL(/\/app\/lists\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: LIST_TITLE })).toBeVisible();

  for (const itemTitle of [FIRST_ITEM, SECOND_ITEM]) {
    await page.getByLabel('Novo item').fill(itemTitle);
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByRole('button', { name: `Marcar ${itemTitle}` })).toBeVisible();
  }

  await page.getByRole('button', { name: `Marcar ${FIRST_ITEM}` }).click();
  await expect(page.getByText('1 de 2 marcados')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await bottomNav.getByRole('link', { name: 'Início' }).click();
  await page.waitForURL(/\/app$/);
  const progressTile = page.getByRole('link', { name: /Lista em andamento/ });
  await expect(progressTile).toContainText(LIST_TITLE);
  await expect(progressTile).toContainText('1 de 2');
  await expectNoHorizontalScroll(page);

  await progressTile.click();
  await page.waitForURL(/\/app\/lists\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: `Marcar ${SECOND_ITEM}` }).click();
  await expect(page.getByText('2 de 2 marcados')).toBeVisible();

  await bottomNav.getByRole('link', { name: 'Início' }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByText('Casados há')).toBeVisible();
  await expect(page.getByText('Lista em andamento')).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});
