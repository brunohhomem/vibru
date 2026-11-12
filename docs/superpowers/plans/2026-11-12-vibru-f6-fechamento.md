# Vibru F6 — Fechamento da Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar a Agenda e o feed ICS, já escritos e sem commit na branch `feat/vibru-f6-agenda`, até o merge na `main` com o gate verde.

**Architecture:** O código da F6 já existe na árvore de trabalho: `apps/api/src/modules/agenda/`, `packages/shared/src/agenda/`, `apps/web/src/features/agenda/` e a migration `0015_create_agenda.sql`. Já passaram typecheck, build, boot:check e testes unitários, e os 17 testes de `test/agenda.int-spec.ts` passaram isoladamente. Falta corrigir um erro de lint, rodar o gate inteiro, conferir o visual, commitar e integrar.

**Tech Stack:** NestJS 12, Drizzle, Next.js, TanStack Query, Vitest, Playwright.

**Spec:** sem spec, por decisão do Bruno. A referência é o ADR 0003 (seções 3, 4.3, 4.4 e 7) e o ADR 0004 (seção 6, que renumera as fases).

## Global Constraints

- Gate pré-push: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm turbo run build --force`, `pnpm boot:check`, `pnpm test`, `pnpm test:integration` (com `pnpm infra:up`), `pnpm e2e`.
- Commits em Conventional Commits, em inglês, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O hook bloqueia heredoc: use vários `-m`. O commitlint limita o corpo a 100 caracteres por linha.
- Nada de `eslint-disable` para satisfazer métrica, e nenhuma função dividida só para caber nela (AGENTS.md, regra 4).
- O login do e2e aceita 5 tentativas por 15 minutos e o e2e usa as 5. Antes de rodar o e2e de novo, zere as chaves `*throttle*` do Redis local (`vibru-redis-1`, senha `redis`).

## Review Focus

1. URL do feed com o token em log de erro 500: `redactIcsToken` cobre o filtro de exceções. Confira que nenhum outro `logger` grava `request.url`.
2. Mês na virada de ano: `shiftMonth('2026-12', 1)` precisa dar `2027-01`; já está coberto em `agenda-calendar.spec.ts`.
3. Evento das 23h30 em São Paulo no feed: precisa sair com `TZID=America/Sao_Paulo`, nunca em UTC. Já está coberto em `agenda.int-spec.ts`.
4. Tela de Agenda em 390px com 3 itens no mesmo dia: a grade não pode gerar rolagem horizontal. Já está coberto por `expectNoHorizontalScroll` no e2e.
5. Data do casamento alterada com a Agenda aberta: a lista precisa refletir a mudança. `couple-settings-screen` invalida `AGENDA_QUERY_KEY`; a conferência é visual, na Task 2.

---

### Task 1: Lint verde e gate completo

**Files:**

- Modify: `apps/api/test/agenda.int-spec.ts:367-370`
- Revert: `apps/web/next-env.d.ts` (alterado pelo `next dev`, fora do escopo)

- [ ] **Step 1: Corrigir o erro de `@typescript-eslint/naming-convention`**

Troque o tipo da query para `{ icsTokenHash: string }` e o SQL para `SELECT ics_token_hash AS "icsTokenHash" FROM couple_members WHERE id = $1`. O mesmo padrão já é usado em `apps/api/test/casal.int-spec.ts:176`. Ajuste as duas asserções para `stored.rows[0]?.icsTokenHash`.

- [ ] **Step 2: Descartar a mudança gerada pelo dev server**

Run: `git checkout -- apps/web/next-env.d.ts`
Expected: `git status --short apps/web/next-env.d.ts` sem saída.

- [ ] **Step 3: Rodar o gate**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm turbo run build --force && pnpm boot:check && pnpm test && pnpm test:integration`
Expected: lint com 0 erros, e avisos novos só de métrica (`max-params`, `max-lines-per-function`, `complexity`), sem `eslint-disable`. Integração com todos os arquivos verdes, `agenda.int-spec.ts` incluído.

- [ ] **Step 4: Zerar o throttle e rodar o e2e**

Run: apague as chaves `*throttle*` do Redis local, depois `pnpm e2e`
Expected: `4 passed`. O teste "admin cria lista…" agora também cria o evento "Jantar de aniversário" e baixa o feed pelo proxy do Next com `text/calendar`.

### Task 2: Conferência visual da Agenda, do feed e do histórico da F5

**Files:** nenhum, a menos que a conferência encontre defeito.

- [ ] **Step 1: Subir o app**

Use `.claude/launch.json` (api, worker, web) e entre como admin do seed.

- [ ] **Step 2: Conferir `/app/agenda` em 390px e em `lg`, nos temas claro e escuro**

Expected: grade de 7 colunas sem rolagem horizontal; hoje destacado em `primary`; bodas e datas em `sand`; alvos de toque com pelo menos 44px; "Nada marcado" num mês vazio; navegação entre meses sem piscar o esqueleto, graças ao `keepPreviousData`.

- [ ] **Step 3: Conferir o card "Calendário do celular" em `/app/couple`**

Expected: "Gerar link" mostra a URL uma vez; "Gerar novo link" e "Desligar" pedem confirmação; depois de desligar, o card volta a "Gerar link".

- [ ] **Step 4: Conferir o "Histórico" na ficha de saúde (pendente da F5)**

Expected: criar, editar e remover um evento pela tela; o médico removido some do select.

- [ ] **Step 5: Corrigir o que falhar, repetindo o Step 3 da Task 1**

### Task 3: Commit, PR e merge

- [ ] **Step 1: Commitar a F6**

Inclua tudo o que está em `apps/`, `packages/` e as migrations. Deixe `.claude/launch.json` fora, a menos que o Bruno peça para versioná-lo.

```bash
git add apps packages
git commit -m "feat(agenda): agenda, important dates and ics feed" -m "<corpo com até 100 colunas por linha>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Push e PR**

Run: `git push -u origin feat/vibru-f6-agenda` e `gh pr create --base main`, com a seção "Decisões":

- `events` sem `wish_id`, que fica para a F7.
- `important_dates` sem `kind`.
- Token ICS em `couple_members.ics_token_hash`.
- Uma ocorrência por ano no feed, sem `RRULE`.
- Notas dos eventos fora do feed.
- Janela do feed de 1 ano para trás até 2 para a frente.
- Rota `/api/ics/*` fora do log.
- `HealthSheet` reaproveitado nos formulários da Agenda.

- [ ] **Step 3: Esperar o CI e fazer o merge**

Expected: `verify`, `integration` e `e2e` verdes. Merge com `gh pr merge --merge`, como nas PRs #4 e #5.
