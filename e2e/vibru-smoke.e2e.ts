import { expect, test, type Page } from '@playwright/test';

const INITIAL_PASSWORD = 'Admin@12345';
const NEXT_PASSWORD = 'NovaSenha456';
const NEW_DISPLAY_NAME = 'Bruno E2E';
const TASK_TITLE = 'Comprar pão';
const LIST_TITLE = 'Mercado da semana';
const FIRST_ITEM = 'Café';
const SECOND_ITEM = 'Pão';
const MEDICATION_NAME = 'Losartana';
const MEDICATION_TASK = 'Tomar Losartana 50 mg';
const ALLERGY_SUBSTANCE = 'Amendoim';
const AGENDA_EVENT = 'Jantar de aniversário';
const WISH_TITLE = 'Piquenique';
const DATE_IDEA_TITLE = 'Cinema ao ar livre no parque da cidade';

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
  // O seed traz as datas do casal; sem elas, a home fica só com os blocos fixos.
  await page.getByLabel('Início do namoro').fill('');
  await page.getByLabel('Data do casamento').fill('');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Configurações do casal salvas')).toBeVisible();

  await page.getByRole('button', { name: 'Abrir menu do casal' }).click();
  await expect(page.getByText(`${NEW_DISPLAY_NAME} e Parceira`)).toBeVisible();
  await page.keyboard.press('Escape');

  await bottomNav.getByRole('link', { name: 'Início' }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByText('Defina as datas do casal')).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(NEW_DISPLAY_NAME) })).toBeVisible();
  for (const optionalTile of [
    'Próxima data',
    'Lista em andamento',
    'Ideia de rolê',
    'Próximas bodas',
    'Aniversário de namoro',
  ]) {
    await expect(page.getByText(optionalTile)).toHaveCount(0);
  }
  await expectNoHorizontalScroll(page);
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

  await bottomNav.getByRole('link', { name: 'Agenda' }).click();
  await page.waitForURL(/\/app\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

  await page.getByRole('button', { name: 'Novo evento' }).click();
  await page.getByLabel('Título').fill(AGENDA_EVENT);
  await page.getByLabel('Horário').fill('20:30');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Evento criado')).toBeVisible();
  await expect(page.getByRole('button', { name: `Editar 20:30 · ${AGENDA_EVENT}` })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await bottomNav.getByRole('link', { name: 'Desejos' }).click();
  await page.waitForURL(/\/app\/wishes/);
  await page.getByRole('button', { name: 'Novo desejo' }).click();
  await page.getByLabel('Título').fill(WISH_TITLE);
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('date_idea');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Desejo adicionado')).toBeVisible();
  await page.getByRole('button', { name: `Planejar ${WISH_TITLE}` }).click();
  await page.getByLabel('Horário').fill('19:00');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Planejado na Agenda')).toBeVisible();
  await expect(page.getByText(/Planejado para/)).toBeVisible();
  await expectNoHorizontalScroll(page);

  await bottomNav.getByRole('link', { name: 'Agenda' }).click();
  await page.waitForURL(/\/app\/agenda$/);
  await expect(page.getByRole('button', { name: `Editar 19:00 · ${WISH_TITLE}` })).toBeVisible();

  // O desejo planejado sai da ideia de rolê; uma ideia sem plano toma o lugar dele.
  await bottomNav.getByRole('link', { name: 'Desejos' }).click();
  await page.waitForURL(/\/app\/wishes/);
  await page.getByRole('button', { name: 'Novo desejo' }).click();
  await page.getByLabel('Título').fill(DATE_IDEA_TITLE);
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('date_idea');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Desejo adicionado')).toBeVisible();

  await bottomNav.getByRole('link', { name: 'Início' }).click();
  await page.waitForURL(/\/app$/);
  const nextDateTile = page.getByRole('link', { name: /Próxima data/ });
  await expect(nextDateTile).toContainText(WISH_TITLE);
  await expect(nextDateTile).toContainText('Hoje');
  const dateIdeaTile = page.getByRole('link', { name: /Ideia de rolê/ });
  await expect(dateIdeaTile).toContainText(DATE_IDEA_TITLE);
  await expectNoHorizontalScroll(page);

  await dateIdeaTile.click();
  await page.waitForURL(/\/app\/wishes\?categoria=date_idea$/);
  await expect(page.getByRole('article', { name: DATE_IDEA_TITLE })).toBeVisible();

  await page.goto('/app/couple');
  await page.getByRole('button', { name: 'Gerar link' }).click();
  const feedUrl = await page.getByLabel('Link do calendário').inputValue();
  const feed = await page.request.get(feedUrl);
  expect(feed.status()).toBe(200);
  expect(feed.headers()['content-type']).toContain('text/calendar');
  expect(await feed.text()).toContain(`SUMMARY:${AGENDA_EVENT}`);
  await expectNoHorizontalScroll(page);
});

test('admin monta a ficha, cria remédio, conclui a tomada e usa a Farmácia', async ({ page }) => {
  test.setTimeout(150_000);
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(adminEmail);
  await page.getByLabel('Senha').fill(NEXT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/app$/);

  await page.getByRole('button', { name: 'Abrir menu do casal' }).click();
  await page.getByRole('menuitem', { name: 'Saúde' }).click();
  await page.waitForURL(/\/app\/health$/);
  await expectNoHorizontalScroll(page);

  await page
    .getByRole('link', { name: new RegExp(NEW_DISPLAY_NAME) })
    .first()
    .click();
  await page.waitForURL(/\/app\/health\/[0-9a-f-]+$/);

  await page.getByRole('button', { name: 'Editar dados' }).click();
  await page.getByLabel('Tipo sanguíneo').selectOption('O+');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Ficha atualizada')).toBeVisible();

  await page
    .getByRole('region', { name: 'Alergias' })
    .getByRole('button', { name: 'Adicionar' })
    .click();
  await page.getByLabel('Substância').fill(ALLERGY_SUBSTANCE);
  await page.getByLabel('Gravidade').selectOption('severe');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Alergia adicionada')).toBeVisible();

  await page
    .getByRole('region', { name: 'Remédios' })
    .getByRole('button', { name: 'Adicionar' })
    .click();
  await page.getByLabel('Nome', { exact: true }).fill(MEDICATION_NAME);
  await page.getByLabel('Dosagem').fill('50 mg');
  await page.getByRole('button', { name: 'Adicionar horário' }).click();
  await page.getByLabel('Horário 1', { exact: true }).fill('08:00');
  await page.getByRole('switch', { name: 'Controlar estoque' }).click();
  await page.getByLabel('Unidades em estoque').fill('2');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Remédio adicionado')).toBeVisible();

  const history = page.getByRole('region', { name: 'Histórico' });
  await history.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByLabel('Tipo', { exact: true }).selectOption('vaccine');
  await page.getByLabel('Título').fill('Vacina da gripe');
  await page.getByLabel('Data', { exact: true }).fill('2026-03-10');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Evento registrado')).toBeVisible();
  await expect(history.getByRole('button', { name: /Vacina da gripe/ })).toContainText(
    'Vacina · 10 de março de 2026',
  );
  await expectNoHorizontalScroll(page);

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await bottomNav.getByRole('link', { name: 'Tarefas' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();
  await expect(page.getByText(MEDICATION_TASK)).toHaveCount(0);

  await page.getByRole('switch', { name: 'Mostrar remédios' }).click();
  await expect(page.getByText(MEDICATION_TASK)).toBeVisible();

  await page.getByRole('button', { name: `Concluir ${MEDICATION_TASK}` }).click();
  const lowStockDialog = page.getByRole('dialog', { name: 'Estoque acabando' });
  await expect(lowStockDialog).toContainText(/Losartana acaba em \d+ dias?/);
  await lowStockDialog.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('Adicionado à Farmácia')).toBeVisible();

  await bottomNav.getByRole('link', { name: 'Listas' }).click();
  await page.getByRole('link', { name: /Farmácia/ }).click();
  await page.waitForURL(/\/app\/lists\/[0-9a-f-]+$/);
  await expect(page.getByText(MEDICATION_NAME)).toBeVisible();

  await bottomNav.getByRole('link', { name: 'Início' }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole('link', { name: /Remédios de hoje: 1 de 1/ })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('link', { name: /Remédios de hoje/ }).click();
  await page.waitForURL(/\/app\/health$/);
  await page.getByRole('link', { name: `Emergência de ${NEW_DISPLAY_NAME}` }).click();
  await page.waitForURL(/\/app\/health\/[0-9a-f-]+\/emergency$/);
  await expect(page.getByText('O+')).toBeVisible();
  await expect(page.getByText(ALLERGY_SUBSTANCE)).toBeVisible();
  await expectNoHorizontalScroll(page);
});
