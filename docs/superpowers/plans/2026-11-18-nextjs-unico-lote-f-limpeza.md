# Lote F — limpeza (N3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Apagar o que a migração deixou para trás (`legacy/`, `@vibru/shared`, `axios`, o rewrite para a API antiga, o preset de ESLint do Nest, docs e specs do monorepo antigo) e deixar `AGENTS.md`, `README.md` e `docs/conventions/*` descrevendo o app Next único como ele é.

**Architecture:** O que ainda vem de `legacy/shared` (calendário, bodas, schemas do casal, login) é absorvido pelo app. `applyApiError` vira `applyActionError` (só `ActionResultError`). Nada novo de comportamento, exceto o fechamento de uma brecha herdada do lote D (reabrir tarefa duas vezes).

**Tech Stack:** Next 16, Drizzle/Neon, Better Auth, zod 4, Vitest.

**Spec:** `docs/specs/N2-dominios.md` (lote F), `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md` (seção de limpeza), `docs/adr/0005-nextjs-unico.md`.

## Global Constraints

- Nenhum comportamento visível muda. Toda a suíte (lint, typecheck, testes, build) continua verde a cada commit.
- Sem `eslint-disable`; regras do `AGENTS.md` continuam (guard clause, nomes completos, `page.tsx`/`layout.tsx` sem `'use client'`, hooks só em `*.client.tsx`/`hooks/`/`components/ui`, mobile-first).
- Histórico fica no git: apagar é seguro. ADRs 0001–0005 ficam (registro de decisões).

## Rulings (decididos ao planejar)

- **Absorção do que sobrou de `legacy/shared`:** `calendar-date` (+spec) vai para `src/lib/calendar-date.ts`; `bodas` (+spec) e os schemas do casal (`calendarDateSchema`, `updateCoupleRequestSchema`, `updateMyMemberRequestSchema`, tipos `CoupleResponse`/`CoupleMember`/`MemberColor`) vão para `src/features/couple/`; `loginRequestSchema` vai para `src/features/auth/`. `AuthResponse` passa a ser um tipo local do feature `auth`.
- **`applyApiError` → `applyActionError`** em `src/lib/action-error.ts`; o ramo do axios, `errorResponseSchema` e os mapas de código de erro saem junto.
- **O que sai de `config/`:** `eslint/nest.mjs`, `eslint/fixtures/`, `package.json`, `eslint.config.mjs` e `tsconfig.json` da pasta (era o pacote `@vibru/config`). Ficam os presets que o app usa: `eslint/{base,next}.mjs` e `tsconfig/{base,next,node}.json`. O "preset de camadas" do Nest (controller não importa drizzle) some com `nest.mjs`.
- **Docs apagados:** specs e planos do monorepo antigo (`docs/specs/{F0,F1,F2,F3,V1,vibru-F*}`, `*-progresso`, `docs/specs/arquivo`, planos `2026-11-12-*`), `docs/auth.md` antigo e `docs/email.md`. **Reescritos curtos:** `AGENTS.md`, `README.md`, `docs/auth.md`, `docs/conventions/{backend→server-actions,database,testing,tooling,frontend}.md`.
- **Brecha herdada (lote D):** `clearTaskCompletion` ganha `completed_at IS NOT NULL` no `WHERE`; duas reaberturas simultâneas não devolvem a dose duas vezes.
- **Fora deste lote (seguem como menores anotados nas PRs):** erro de responsável com nome de campo diferente na edição de tarefa, reancoragem de série recorrente, `try/catch` da rota ICS, devolução de estoque acima do que saiu.

## Review Focus

- Nada em `src` importa `@vibru/shared`, `axios` ou `legacy`; `pnpm build` sem as dependências removidas.
- O que o `legacy/shared` exportava e o app ainda usava continua com o mesmo comportamento (specs de calendário e bodas passam sem alteração de expectativa).
- CI, Husky, lint-staged, tsconfig, vitest e `.gitignore` não citam caminhos apagados.
- Reabrir tarefa já aberta falha com "Tarefa não está concluída" mesmo sob concorrência (o `UPDATE` condicional).
- `AGENTS.md` e `README.md` não mencionam NestJS, Redis, Docker, e-mail, BullMQ, `apps/*`, `packages/*` nem comandos que não existem.

---

### Task 1: Absorver o que sobrou de `legacy/shared`

**Files:**

- Create: `src/lib/calendar-date.ts` + spec, `src/features/couple/bodas.ts` + spec, `src/features/couple/couple-schemas.ts`, `src/features/auth/login-schema.ts`
- Modify: imports de `@vibru/shared` e `@vibru/shared/zod` em `src` (script de migração), `tsconfig.json` (remove `paths` de `@vibru/shared`), `vitest.config.mjs` (remove alias)
- Source: `legacy/shared/src/couple/*`, `legacy/shared/src/auth/schemas.ts` (login)

**Interfaces:**

- Produces: mesmos nomes exportados do legado (`CalendarDate`, `todayInSaoPaulo`, `parseCalendarDate`, `formatCalendarDate`, `daysInMonth`, `daysBetween`, `addDays`, `elapsedParts`, `nextAnnualOccurrence`, `annualOccurrenceInYear`, `bodasName`, `calendarDateSchema`, `updateCoupleRequestSchema`, `updateMyMemberRequestSchema`, `CoupleResponse`, `CoupleMember`, `MemberColor`, `loginRequestSchema`), agora de `@/lib/calendar-date`, `@/features/couple/*`, `@/features/auth/login-schema`.

- [ ] **Step 1:** Copiar os arquivos ajustando imports; estender o script `migrate-imports.mjs` do scratchpad com os novos módulos e rodá-lo; trocar `@vibru/shared/zod` por `zod`.
- [ ] **Step 2:** `AuthResponse` local em `src/features/auth/` (`{ user: { id; email; role: 'user'; mustChangePassword; emailVerified } }`), trocando o import em `actions.ts`.
- [ ] **Step 3:** Remover `paths` e alias de `@vibru/shared`; `pnpm vitest run src/lib src/features/couple` — Expected: specs de calendário e bodas passam sem mudar expectativa. `rg "@vibru/shared" src` — Expected: sem ocorrências (exceto `AUTH_ERROR_*`/`PEOPLE_ERROR_CODES`/`errorResponseSchema`, tratados na Task 2).
- [ ] **Step 4:** lint, typecheck, test, build; commit `refactor: absorb the remaining legacy/shared code into the app`.

### Task 2: Sem axios

**Files:**

- Create: `src/lib/action-error.ts` (+ `action-error.spec.ts` movido de `api-error.spec.ts`)
- Delete: `src/lib/api.ts`, `src/lib/api-error.ts`
- Modify: todos os consumidores de `applyApiError` (renomear para `applyActionError`), `package.json` (remove `axios`), lockfile

**Interfaces:**

- Produces: `applyActionError<T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>): void` — `ActionResultError` com `field` e `setError` vai para o campo; senão `toast.error(message)`; erro desconhecido vira "Não foi possível concluir a ação".

- [ ] **Step 1 (RED):** mover o spec para `action-error.spec.ts` apontando para `./action-error`; acrescentar o caso de erro desconhecido (não `ActionResultError`) → toast genérico. Rodar — falha por módulo ausente.
- [ ] **Step 2:** Implementar `action-error.ts`; `sed` do nome em `src`; apagar `api.ts`/`api-error.ts`; `pnpm remove axios`.
- [ ] **Step 3:** `rg "axios|lib/api" src package.json` — Expected: sem ocorrências. lint, typecheck, test, build; commit `refactor: drop axios and the legacy API client`.

### Task 3: Apagar `legacy/` e o que dependia dele

**Files:**

- Delete: `legacy/`, `src/lib/legacy-rewrites.spec.ts`, `config/eslint/{nest.mjs,fixtures}`, `config/{package.json,eslint.config.mjs,tsconfig.json}`
- Modify: `next.config.ts` (sem rewrite nem `API_ORIGIN`), `eslint.config.mjs` (sem `ignores` de legacy/fixtures), `tsconfig.json` (`exclude` sem `legacy`), `vitest.config.mjs` (`exclude` sem `legacy/**`, `e2e/**`, `*.integration.spec.ts`), `.env.example`, `.github/workflows/ci.yml` e `lint-staged.config.mjs` se citarem caminhos apagados, `.gitignore`

- [ ] **Step 1:** Apagar; ajustar as configs; `rg "legacy|API_ORIGIN|@vibru/config|nest" -g '!node_modules' -g '!docs' .` — Expected: só ocorrências em docs a reescrever na Task 4.
- [ ] **Step 2:** `pnpm install` (lockfile), lint, typecheck, test, build; `pnpm start` + `curl` em `/api/ics/x.ics` (404 local) e `/api/auth/get-session` (200); commit `chore: delete legacy/, the API rewrite and the Nest lint preset`.

### Task 4: Fechar a brecha de reabrir duas vezes (herdada do lote D)

**Files:**

- Modify: `src/features/tasks/tasks-repository.ts` (`clearTaskCompletion`), `src/features/tasks/actions.ts`, `src/features/tasks/actions.spec.ts`

**Interfaces:**

- Produces: `clearTaskCompletion(coupleId, taskId, executor): Promise<TaskRow | null>` — `null` quando a tarefa já não estava concluída; `reopenTaskAction` lança `ActionFailure('failed', 'Tarefa não está concluída')` dentro da transação (desfaz o resto).

- [ ] **Step 1 (RED):** spec: com `clearTaskCompletion` devolvendo `null` (segunda reabertura), `reopenTaskAction` falha com "Tarefa não está concluída" e **não** chama `returnDose` nem apaga filho.
- [ ] **Step 2:** `WHERE ... AND completed_at IS NOT NULL`, retorno `null`; a action lança a falha antes de `returnDose`. PASS; lint, typecheck; commit `fix(tasks): reopening twice no longer returns the dose twice`.

### Task 5: Docs

**Files:**

- Delete: `docs/specs/{F0-fundacao,F1-banco-e-base-da-api,F1-progresso,F2-autenticacao,F2-progresso,F3-email-e-configuracoes,V1-execucao,vibru-F1-casal-e-base-visual,vibru-F2-tarefas,vibru-F3-listas,vibru-F4-saude}.md`, `docs/specs/arquivo/`, `docs/superpowers/plans/2026-11-12-*`, `docs/email.md`, `CHANGELOG.md`
- Rewrite: `AGENTS.md`, `README.md`, `docs/auth.md`, `docs/conventions/backend.md` → `docs/conventions/server-actions.md`, `database.md`, `testing.md`, `tooling.md`, `frontend.md`
- Modify: referências quebradas em ADRs/specs que apontem para arquivos apagados (só links, sem reescrever decisões)

- [ ] **Step 1:** Reescrever `AGENTS.md` (comandos reais de `package.json`, fluxo ADR→spec→plano, regras inegociáveis sem as de Nest, índice) e `README.md` (requisitos, primeiro uso com Neon e seed, comandos, onde ler).
- [ ] **Step 2:** Reescrever as convenções curtas a partir do código: server actions (`defineAction`/`defineMemberAction`, `ActionResult`, pura-primeiro), banco (Drizzle, Neon, migrations, `coreColumns`, soft delete), testes (sem banco de teste, mocks de repositório, o que já cobre), tooling (versões, ESLint presets, Husky, CI de um job), frontend (`*.client.tsx`, TanStack Query, `unwrapActionResult`); `docs/auth.md` com Better Auth, rate limit, sessão, seed e troca de senha.
- [ ] **Step 3:** `rg "NestJS|Nest|Redis|Docker|BullMQ|Mailpit|apps/|packages/|infra:|keys:|boot:check|pnpm e2e|test:integration" AGENTS.md README.md docs/conventions docs/auth.md` — Expected: sem ocorrências. `pnpm format:check`; commit `docs: rewrite AGENTS, README and conventions for the single Next app`.

### Task 6: Fechamento

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check`.
- [ ] **Step 2:** Revisão final com subagente Opus, correção em uma passada, PR e CI.
