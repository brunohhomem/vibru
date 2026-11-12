# Vibru F8 — Home final em bento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a home em bento com todos os blocos do v1, adicionando "Próxima data" e "Ideia de rolê" aos que já existem, e completar o smoke E2E mobile.

**Architecture:**

- A home continua compondo consultas no cliente (`home-screen.client.tsx`), sem endpoint agregador.
- A API ganha `GET /api/agenda/upcoming`, que reaproveita `AgendaCalendarService.listBetween`.
- O web ganha um hook para a ideia de rolê sobre `GET /api/wishes`.
- Blocos sem dado não aparecem, e a grade usa `grid-flow-dense` para não deixar buraco (ADR 0003, 6.6).

**Tech Stack:** NestJS, Next.js, TanStack Query, Tailwind, Playwright.

**Spec:** sem spec, por decisão do Bruno. A referência é o ADR 0003, seção 2 item 8, seção 6 itens 4 e 6, e seção 9 (bento sem dado), mais o ADR 0004, seção 6 (F8) e item 2.4 (bloco de saúde).

## Global Constraints

- Branch `feat/vibru-f8-home`, criada da `main` depois do merge da F7.
- Blocos do v1: contador do casamento, tarefas de cada um, próxima data, bodas, namoro, lista em andamento, ideia de rolê, e a linha "Remédios de hoje" (ADR 0004, item 9.1, fora da contagem de tarefas).
- Grade: 2 colunas no mobile, 4 a partir de `lg`, `gap` de 8px, cantos de 24–28px; bloco opcional sem dado não aparece.
- Mobile-first: só `min-width`, sem variante `max-*` (AGENTS.md, regra 10).
- Sem login novo no e2e: os 5 logins estão em uso.
- Gate, commits, `-m` e commitlint: iguais ao plano da F6.

## Review Focus

1. Casal sem casamento, sem namoro, sem listas e sem desejos: a home mostra só o contador e as tarefas, sem buraco nem bloco vazio. Teste e2e na Task 3.
2. Próxima data hoje: "Hoje", não "em 0 dias". Teste na Task 1.
3. Próxima data a mais de 365 dias, ou nenhuma: o bloco some. Teste na Task 1.
4. Ideia de rolê concluída: sai do bloco e o próximo desejo `date_idea` aberto toma o lugar. Teste na Task 2.
5. Tela de 390px com 7 blocos: sem rolagem horizontal, e títulos longos de desejo quebram linha em vez de estourar. Teste na Task 3.

---

### Task 1: `GET /api/agenda/upcoming` e bloco "Próxima data"

**Files:**

- Modify: `packages/shared/src/agenda/schemas.ts`, adicionando `agendaUpcomingResponseSchema = { today, next: { kind: 'event' | 'important_date' | 'wedding' | 'dating', date, title, daysUntil } | null }`
- Modify: `apps/api/src/modules/agenda/agenda-calendar.service.ts`, adicionando `getUpcoming(member): Promise<AgendaUpcomingResponse>`
- Modify: `apps/api/src/modules/agenda/agenda.controller.ts` (`@Get('upcoming')`, declarado antes de qualquer rota com parâmetro)
- Modify: `apps/web/src/features/home/components/home-screen.client.tsx`, adicionando `NextDateTile`
- Create: `apps/web/src/features/agenda/hooks/use-agenda-upcoming.ts`
- Test: `apps/api/test/agenda.int-spec.ts`

**Interfaces:**

- Consumes: `AgendaCalendarService.listBetween(coupleId, { from: today, to: today + 365 dias })` e `daysBetween` do shared.
- Produces: `next` é o primeiro item por data. No mesmo dia, a ordem é bodas, depois namoro, depois data importante, depois evento, e o evento com horário fica depois do evento sem horário.

- [ ] **Step 1: Casos de uso em `agenda.int-spec.ts`**
  - "Próxima data é o aniversário de amanhã": `daysUntil: 1`.
  - "Evento hoje": `daysUntil: 0`.
  - "Nada nos próximos 365 dias": `next: null`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3:** Implementar `getUpcoming` e a rota.
- [ ] **Step 4:** Implementar `NextDateTile`, em `sand` quando for bodas ou namoro e em `card` nos demais casos. O texto usa `daysUntilLabel`, de `home-format.ts`, e mostra "Hoje" quando `daysUntil` é 0. O bloco só aparece com `next !== null`.
- [ ] **Step 5:** Rodar a integração da Agenda. Expected: PASS.
- [ ] **Step 6: Commit** `feat: next date on home`

### Task 2: Bloco "Ideia de rolê"

**Files:**

- Modify: `apps/web/src/features/home/components/home-screen.client.tsx`, adicionando `DateIdeaTile`
- Create: `apps/web/src/features/home/lib/pick-date-idea.ts`, com `pickDateIdea(wishes: Wish[]): Wish | undefined`
- Test: `apps/web/src/features/home/lib/pick-date-idea.spec.ts`

**Interfaces:**

- Consumes: `useWishes({ status: 'open' })`, da F7, Task 4.
- Produces: `pickDateIdea` devolve o desejo `date_idea` aberto e sem `plannedOn` mais antigo por `createdAt`. A escolha é determinística, sem aleatoriedade, para não trocar a cada render.

- [ ] **Step 1: Testes** de `pickDateIdea`:
  - devolve o mais antigo;
  - ignora o planejado e o de outra categoria;
  - lista vazia devolve `undefined`.
- [ ] **Step 2: Rodar e ver falhar; implementar; rodar e ver passar.**
- [ ] **Step 3:** `DateIdeaTile` é um link para `/app/wishes?categoria=date_idea`, com imagem quando houver, e só aparece com ideia disponível.
- [ ] **Step 4: Commit** `feat(web): date idea on home`

### Task 3: Bento sem buraco e smoke E2E completo

**Files:**

- Modify: `apps/web/src/features/home/components/home-screen.client.tsx`
- Modify: `apps/web/e2e/vibru-smoke.e2e.ts`
- Modify: `DESIGN.md`, seção "Bento", descrevendo a ordem final dos blocos e o `grid-flow-dense`

- [ ] **Step 1:** Fixar a ordem dos blocos:
  1. contador (2×2);
  2. tarefas de cada um;
  3. próxima data;
  4. lista em andamento;
  5. ideia de rolê;
  6. bodas;
  7. namoro.

  Adicione `grid-flow-dense` à grade.

- [ ] **Step 2:** Estender o primeiro teste e2e (admin, home vazia de dados opcionais), afirmando que "Lista em andamento", "Ideia de rolê" e "Próxima data" têm `toHaveCount(0)`, com `expectNoHorizontalScroll`.
- [ ] **Step 3:** Estender o teste "admin cria lista…" para, depois do desejo da F7, voltar à home e afirmar os blocos "Próxima data" ("Piquenique", hoje) e "Ideia de rolê". Para a ideia aparecer, crie um segundo desejo `date_idea` sem planejar.
- [ ] **Step 4:** Rodar o gate completo, zerando o throttle antes do e2e. Expected: `4 passed`.
- [ ] **Step 5:** Conferência visual da home em 390px e `lg`, claro e escuro.
- [ ] **Step 6: Commit** `feat(web): final bento home` e `test(e2e): full smoke`

### Task 4: PR e merge

- [ ] **Step 1:** Push e PR, com o checklist do v1 do ADR 0003, seção 2, marcado.
- [ ] **Step 2:** CI verde e `gh pr merge --merge`.
