# Next.js único, Fase 1 (esqueleto): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter um único app Next.js na raiz do repositório com Postgres, Drizzle, Better Auth, login funcionando e seed dos 2 usuários, sem Redis, e-mail nem API NestJS no caminho de login.

**Architecture:** `apps/web` sobe para a raiz (frontend intocado). `apps/api` e `packages/*` vão para `legacy/` (fora de workspace, lint e tsc) só para servir de referência às Fases 2 e 3, e são apagados na Fase 3. Auth e banco vivem em `src/lib` e `src/db`; toda ação autenticada passa por um wrapper único `defineAction`.

**Tech Stack:** Next 16.4.2, React 19.3.1, TypeScript 6, Drizzle + drizzle-kit, Better Auth, zod 4.6.7, TanStack Query 5, Postgres 18.1, Vitest 5, Playwright 1.64.1, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md` (aprovado em 2026-11-18). Esta é a **Fase 1 de 3**; Fases 2 (portar domínios) e 3 (limpeza, CI, docs) ganham plano próprio.

## Global Constraints

- Um só app Next na raiz. Sem `apps/`, sem `packages/` ativos, sem turbo.
- Só Postgres como infra. Sem Redis, BullMQ, worker, e-mail, Mailpit.
- Hospedagem na Vercel: sem estado em memória entre requisições; conexão ao Postgres precisa funcionar em função efêmera.
- Better Auth só com e-mail e senha, sem plugins, sem papéis, sem cadastro aberto, sem verificação de e-mail. Rate limit com armazenamento em **banco**.
- Sessão de 90 dias (valor herdado da F1 do vibru).
- Toda action autenticada valida a sessão antes de qualquer acesso ao banco; todo dado de fora entra como `unknown` e é validado com zod.
- Regras do `AGENTS.md`: guard clause, sem `any` sem justificativa, `page.tsx`/`layout.tsx` sem `'use client'`, hooks só em `*.client.tsx`/`hooks/`/`components/ui`, mobile-first, nomes completos, sem `eslint-disable` para satisfazer métrica.
- Ordem do `AGENTS.md`: ADR e spec aprovados antes de executar (Task 1).
- Banco recriado do zero; migrations reiniciadas; nada a preservar.
- Portas de desenvolvimento do vibru: Postgres `25432`, Web `3100`.

## Review Focus

- Login com senha errada e com e-mail inexistente devem devolver a **mesma** mensagem (sem enumerar usuários).
- Rate limit de login precisa persistir no banco: segunda instância/requisição ainda vê o bloqueio.
- Rodar o seed duas vezes não duplica nem troca a senha de usuário já existente.
- Cookie de sessão ausente, expirado ou adulterado em rota protegida redireciona ao login (e a action devolve erro tipado, não exceção).
- Seed sem `SEED_USER_*` configurado falha cedo com mensagem clara, sem criar usuário parcial.

---

### Task 1: ADR e spec da Fase 1

**Files:**

- Create: `docs/adr/0005-nextjs-unico.md`, `docs/specs/N1-esqueleto-nextjs.md`

**Interfaces:**

- Produces: registro da decisão que o `AGENTS.md` exige antes de executar.

- [ ] **Step 1:** Escrever o ADR 0005 resumindo Contexto, Decisão (app único, Better Auth, Vercel, sem e-mail) e Consequências, copiando as decisões 1 a 6 do design. Marcar `Status: aceito` e `Substitui parcialmente: 0001, 0002`.
- [ ] **Step 2:** Escrever `docs/specs/N1-esqueleto-nextjs.md` no formato das specs F1+ (tabela de cabeçalho, regras de execução, entregas = as Tasks 2 a 8 deste plano).
- [ ] **Step 3:** Commit: `docs: adr 0005 and spec N1 for single Next.js app`.

### Task 2: Achatar o repositório

**Files:**

- Move: `apps/web/{src,e2e,next.config.ts,postcss.config.mjs,playwright.config.ts,vitest.config.mjs,tsconfig.json,eslint.config.mjs}` para a raiz
- Move: `apps/api` para `legacy/api`; `packages/shared` para `legacy/shared`; `packages/config` e `packages/scripts` para `legacy/`
- Modify: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `lint-staged.config.mjs`, `.gitignore`, `.github/workflows/ci.yml`
- Delete: `pnpm-workspace.yaml` (workspaces), `turbo.json`

**Interfaces:**

- Produces: scripts da raiz `dev` (porta 3100), `build`, `lint`, `typecheck`, `test`, `e2e`, `format`, `format:check`. Alias TS `@vibru/shared` apontando para `legacy/shared/src` (ponte temporária, removida na Fase 2).

- [ ] **Step 1: Gate de partida.** Rodar `pnpm lint && pnpm typecheck && pnpm test && pnpm build` e anotar que passa (baseline).
- [ ] **Step 2:** Usar `git mv` para as movimentações acima (preserva histórico). `legacy/` entra em `.eslintignore`/`ignores` do ESLint, `exclude` do `tsconfig` e `.prettierignore`.
- [ ] **Step 3:** Fundir as dependências de `apps/web/package.json` no `package.json` da raiz (nome `vibru`, sem `workspace:*`). Remover `axios` só na Fase 2. Manter `@vibru/shared` resolvido por `paths` no `tsconfig.json` e `turbopack.resolveAlias` no `next.config.ts`.
- [ ] **Step 4:** Reapontar `next.config.ts`: remover o rewrite `/api` para `API_ORIGIN` **não** (o frontend ainda chama a API legada na Fase 1; o rewrite sai na Fase 2 por domínio). Rotas `/api/auth/*` da Task 7 têm precedência, então o rewrite passa a excluí-las.
- [ ] **Step 5:** Ajustar `ci.yml` para um único job com `pnpm install --frozen-lockfile`, `format:check`, `lint`, `typecheck`, `test`, `build` (sem turbo, sem Redis/Mailpit).
- [ ] **Step 6: Verificar.** `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam na raiz. Esperado: mesmo resultado do baseline. `pnpm dev` abre `/login` em `http://localhost:3100`.
- [ ] **Step 7:** Commit: `refactor: flatten monorepo into a single Next.js app`.

### Task 3: Ambiente e Postgres de desenvolvimento

**Files:**

- Create: `src/lib/env.ts`, `src/lib/env.spec.ts`, `.env.example` (reescrito)
- Modify: `compose.dev.yaml` (só `postgres`), `package.json` (`infra:*`)

**Interfaces:**

- Produces: `export const env: { DATABASE_URL: string; DATABASE_POOL_MAX: number; BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string; SEED_USER_ONE_EMAIL; SEED_USER_ONE_PASSWORD; SEED_USER_TWO_EMAIL; SEED_USER_TWO_PASSWORD }` e `export function parseEnv(raw: Record<string, string | undefined>): typeof env`.

- [ ] **Step 1: Write the failing test** em `src/lib/env.spec.ts`: `parseEnv({})` lança erro listando `DATABASE_URL` e `BETTER_AUTH_SECRET`; `parseEnv` com `BETTER_AUTH_SECRET` de 31 caracteres lança; com 32 passa; `DATABASE_POOL_MAX` ausente vira `1`.
- [ ] **Step 2:** Rodar `pnpm vitest run src/lib/env.spec.ts` e ver FAIL ("parseEnv is not a function").
- [ ] **Step 3: Implement** `parseEnv` com um schema zod 4 e `env = parseEnv(process.env)` avaliado de forma preguiçosa (getter) para não quebrar `next build` sem `.env`. Variáveis `SEED_USER_*` ficam opcionais aqui; o seed as exige (Task 6).
- [ ] **Step 4:** Reduzir `compose.dev.yaml` ao serviço `postgres` (imagem `postgres:18.1`, porta `127.0.0.1:25432:5432`). Reescrever `.env.example` só com as chaves acima mais `TEST_DATABASE_URL` apontando para o banco `app_test`.
- [ ] **Step 5:** Rodar o spec e ver PASS; `pnpm infra:up` e `pg_isready` na `25432` responde OK.
- [ ] **Step 6:** Commit: `feat: typed env and postgres-only dev infra`.

### Task 4: Drizzle e cliente de banco

**Files:**

- Create: `drizzle.config.ts`, `src/db/client.ts`, `src/db/schema.ts`, `src/db/migrations/`, `src/db/system-settings.ts`
- Test: `src/db/client.integration.spec.ts`
- Modify: `package.json` (`db:generate`, `db:migrate`, `db:studio`, `test:integration`), `vitest.integration.config.mjs`

**Interfaces:**

- Produces: `export const database` (Drizzle sobre `pg` Pool, **singleton em `globalThis`** para sobreviver ao hot reload; `max = env.DATABASE_POOL_MAX`), `export * from schema` com `systemSettings` portada de `legacy/api/src/modules/settings/system-setting.entity.ts`.
- Consumes: `env` (Task 3).

- [ ] **Step 1: Write the failing test** (integração, usa `TEST_DATABASE_URL`): `database.execute(sql\`select 1 as ok\`)`retorna`ok = 1`; duas importações do módulo devolvem a mesma instância.
- [ ] **Step 2:** Rodar `pnpm test:integration` e ver FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `src/db/client.ts` com `drizzle-orm/node-postgres`. Decisão minha: driver `pg` (funciona no Postgres local e em Neon/Vercel Postgres com URL pooled). Colunas base copiadas de `legacy/api/src/database/columns/core-columns.ts`.
- [ ] **Step 4:** `pnpm db:generate init` cria `0000` limpa, sem `users`; `pnpm db:migrate` aplica no banco de dev e no de teste.
- [ ] **Step 5:** Rodar o teste e ver PASS. Commit: `feat(db): drizzle client and baseline migration`.

### Task 5: Better Auth (config e tabelas)

**Files:**

- Create: `src/lib/auth.ts`, `src/db/auth-schema.ts`, `src/lib/auth.integration.spec.ts`
- Modify: `src/db/schema.ts` (reexporta `auth-schema`), migration nova via `pnpm db:generate auth`

**Interfaces:**

- Produces: `export const auth` (instância Better Auth) e `export type Session = typeof auth.$Infer.Session`.
- Consumes: `database` (Task 4), `env`.
- Tabelas: `user`, `session`, `account`, `verification`, `rateLimit`; campo extra `mustChangePassword boolean not null default false` em `user`. Id decidido pelo construtor (`uuid` se `advanced.database.generateId: 'uuid'` for suportado pela versão instalada; senão texto; registrar a escolha).

- [ ] **Step 1: Write the failing test**: com um usuário criado direto no banco via `auth.$context`, `auth.api.signInEmail` com a senha certa devolve token; com a errada lança; `auth.api.signUpEmail` com um e-mail novo **falha** (cadastro desabilitado); após 6 tentativas erradas seguidas o 7º é bloqueado e existe linha em `rateLimit`.
- [ ] **Step 2:** Rodar o spec e ver FAIL ("auth is not defined").
- [ ] **Step 3: Implement** `betterAuth({ database: drizzleAdapter(database, { provider: 'pg', schema }), emailAndPassword: { enabled: true, disableSignUp: true, autoSignIn: false }, session: { expiresIn: 90 dias em segundos }, rateLimit: { enabled: true, storage: 'database' }, user: { additionalFields: { mustChangePassword } }, secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL })`. Gerar o schema com a CLI do Better Auth e conferir os nomes contra a versão instalada (a API muda entre versões; a documentação instalada manda).
- [ ] **Step 4:** Gerar e aplicar a migration; rodar o spec e ver PASS.
- [ ] **Step 5:** Commit: `feat(auth): better auth with email and password, database rate limit`.

### Task 6: Seed dos 2 usuários

**Files:**

- Create: `src/db/seed.ts`, `src/db/seed-users.ts`, `src/db/seed-users.integration.spec.ts`
- Modify: `package.json` (`db:seed`)

**Interfaces:**

- Produces: `export async function seedUsers(input: { email: string; password: string; name: string }[]): Promise<{ created: number; skipped: number }>`.
- Consumes: `auth.$context` (hash scrypt do Better Auth) e `database`.

- [ ] **Step 1: Write the failing test**: `seedUsers` com 2 entradas devolve `{ created: 2, skipped: 0 }`; chamar de novo devolve `{ created: 0, skipped: 2 }` e o hash da senha **não muda**; e-mail em caixa diferente (`A@x.com` vs `a@x.com`) conta como o mesmo usuário; o login do usuário semeado funciona.
- [ ] **Step 2:** Rodar e ver FAIL.
- [ ] **Step 3: Implement** `seedUsers` inserindo `user` e `account` (provider `credential`) com o hash do contexto do Better Auth, em uma transação. `seed.ts` lê as 4 variáveis `SEED_USER_*` e, se alguma faltar, aborta antes de tocar no banco listando as faltantes.
- [ ] **Step 4:** Rodar o spec e ver PASS; `pnpm db:seed` duas vezes seguidas no banco de dev imprime `created: 2` e depois `skipped: 2`.
- [ ] **Step 5:** Commit: `feat(db): idempotent seed for the two users`.

### Task 7: Login, proxy e wrapper de action

**Files:**

- Create: `src/app/api/auth/[...all]/route.ts`, `src/lib/define-action.ts`, `src/lib/define-action.spec.ts`, `src/features/auth/login-action.ts`, `src/proxy.ts`
- Modify: `src/app/login/*` (form usa a action em vez do axios), remover `src/middleware.ts` e `src/middleware.spec.ts` (o `proxy.ts` do Next 16 os substitui; portar o spec para `src/proxy.spec.ts`)

**Interfaces:**

- Produces:
  - `type ActionResult<TData> = { ok: true; data: TData } | { ok: false; code: 'unauthenticated' | 'invalid_input' | 'failed'; message: string }`
  - `function defineAction<TInput, TData>(config: { schema: z.ZodType<TInput>; handler: (context: { input: TInput; userId: string }) => Promise<TData> }): (rawInput: unknown) => Promise<ActionResult<TData>>`
- Consumes: `auth.api.getSession` com `headers()` do Next.

- [ ] **Step 1: Write the failing test** em `define-action.spec.ts` (sessão simulada): sem sessão devolve `{ ok: false, code: 'unauthenticated' }` **e o handler não é chamado**; input inválido devolve `invalid_input` sem chamar o handler; sucesso devolve `{ ok: true, data }`; exceção do handler devolve `failed` sem vazar a mensagem interna.
- [ ] **Step 2:** Rodar e ver FAIL.
- [ ] **Step 3: Implement** `defineAction` com guard clauses na ordem: sessão, parse zod, handler dentro de try/catch.
- [ ] **Step 4:** `route.ts` exporta `GET` e `POST` via `toNextJsHandler(auth)`. `proxy.ts` só checa a existência do cookie de sessão (`getSessionCookie`) e redireciona rotas `/app/**` para `/login` (e `/login` com cookie para `/app`); matcher exclui `_next`, ícones e `/api/auth`.
- [ ] **Step 5:** `login-action.ts` chama `auth.api.signInEmail` e devolve a mesma mensagem genérica para senha errada e e-mail inexistente (testado em `auth.integration.spec.ts`).
- [ ] **Step 6:** Rodar `pnpm test`, `pnpm test:integration`, `pnpm lint`, `pnpm typecheck` e ver tudo verde.
- [ ] **Step 7:** Commit: `feat(auth): login action, session proxy and defineAction wrapper`.

### Task 8: Fumaça de login ponta a ponta

**Files:**

- Create: `e2e/login.e2e.ts`
- Modify: `playwright.config.ts` (sobe `next start` na `3100` com banco de teste semeado), `e2e/vibru-smoke.e2e.ts` (marcado `test.fixme` com nota "volta na Fase 2/3"; depende da API legada)

**Interfaces:**

- Consumes: seed da Task 6 e `proxy.ts` da Task 7.

- [ ] **Step 1: Write the failing test** `e2e/login.e2e.ts`: visitar `/app` sem login cai em `/login`; login com a senha certa chega em `/app`; senha errada mostra a mensagem genérica e continua em `/login`; recarregar `/app` logado continua logado.
- [ ] **Step 2:** `pnpm build && pnpm e2e e2e/login.e2e.ts` e ver FAIL antes da fiação do Playwright; ajustar a config; ver PASS.
- [ ] **Step 3:** Rodar o gate completo da raiz (`format:check`, `lint`, `typecheck`, `test`, `test:integration`, `build`, `e2e`). Tudo verde.
- [ ] **Step 4:** Commit: `test(e2e): login smoke on single Next.js app`.

---

## Self-review

- **Cobertura do spec (Fase 1):** app único (T2), só Postgres (T3), Drizzle (T4), Better Auth sem papéis e com rate limit em banco (T5), seed idempotente (T6), wrapper de action, proxy e sessão (T7), aceite por E2E (T8), ADR e spec (T1). Fora desta fase por desenho: domínios (F2), limpeza de `legacy/`, docs, ESLint de camadas, `user:reset-password` e troca de senha no perfil (F2/F3).
- **Tipos consistentes:** `database`, `env`, `auth`, `ActionResult`, `defineAction` e `seedUsers` têm uma só definição, nas Tasks 3 a 7.
- **Riscos assumidos:** (1) a ponte `@vibru/shared` por alias pode exigir `transpilePackages`; a Task 2 pega isso no `build`. (2) Nomes e opções do Better Auth dependem da versão instalada; a Task 5 manda conferir. (3) `vibru-smoke.e2e.ts` fica `fixme` até a API ser portada, então a Fase 1 sozinha **não** entrega a app inteira funcionando atrás do login: telas de domínio continuam falando com a API legada via rewrite.
