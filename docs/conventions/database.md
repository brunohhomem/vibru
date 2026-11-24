# Banco de dados

Postgres no Neon, acessado com Drizzle (`drizzle-orm/node-postgres`) por um `Pool`. O schema vive em `src/db/` e só `src/db/schema.ts` é conhecido pelo Drizzle e pelas migrations; cada área declara a tabela no próprio arquivo (`couple-schema.ts`, `tasks-schema.ts`, …) e a reexporta ali.

## Conexão

- `getDatabase()` (`src/db/client.ts`) é preguiçoso e guardado em `globalThis`: o `next build` importa módulos sem `DATABASE_URL`.
- `DATABASE_POOL_MAX` (padrão 1) limita conexões por instância serverless; `attachDatabasePool` (`@vercel/functions`) fecha as ociosas antes de a função ser suspensa.
- Migrations e seed usam `DATABASE_URL_UNPOOLED`; o app usa `DATABASE_URL` (pooled).
- Neon: uma branch `production` (também usada como banco de desenvolvimento). Sem banco de teste (ADR 0005).

## coreColumns

As tabelas de domínio herdam `coreColumns` (`src/db/core-columns.ts`):

| Coluna      | Tipo                       | Detalhes                                                            |
| ----------- | -------------------------- | ------------------------------------------------------------------- |
| `id`        | `uuid`                     | PK, `default uuidv7()` (nativo no Postgres 18), ordenável por tempo |
| `isActive`  | `boolean`                  | Não nulo, padrão `true`; exclusão lógica, sem `deleted_at`          |
| `createdAt` | `timestamp with time zone` | Não nulo, padrão `now()`                                            |
| `updatedAt` | `timestamp with time zone` | Não nulo, padrão `now()`, atualizado pelo Drizzle via `$onUpdate`   |

`$onUpdate` é do Drizzle, não do banco: SQL manual (`UPDATE ... SET ...`) não atualiza `updatedAt`.

As tabelas do Better Auth (`user`, `session`, `account`, `verification`, `rate_limit`) usam ids `text`, como ele espera. Chaves para `user.id` são `text`.

## Datas

Datas de calendário são `YYYY-MM-DD` (`date` com `mode: 'string'`), nunca `Date`: o dia civil não pode depender do fuso do processo. "Hoje" é o de São Paulo (`todayInSaoPaulo`). Comparações com `timestamptz` por dia usam `AT TIME ZONE 'America/Sao_Paulo'` no banco.

## Migrations

- `pnpm db:generate <nome>` gera o SQL em `src/db/migrations/` (excluída do Prettier e das métricas de lint); revise o SQL antes de aplicar.
- `pnpm db:migrate` aplica. Não há `db:push`: só migrations versionadas.
- Em produção a migration roda sozinha: o `buildCommand` do `vercel.json` é `pnpm db:migrate && pnpm build`, com `DATABASE_URL_UNPOOLED` do ambiente de produção. Se a migration falhar, o deploy não sai. O `ignoreCommand` pula o build de qualquer branch que não seja a `main`, então não há preview de PR (os previews usariam o banco de produção).
- Confira sempre o que o gerador escreveu (enums, `check`, FKs, índices) contra o schema.

## Repositório como única porta

Só `*-repository.ts` (e o seed) falam com o Drizzle. Detalhes em `docs/conventions/server-actions.md`.
