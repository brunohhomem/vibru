# Vibru

App para duas pessoas (um casal): tarefas, listas, saúde, agenda com feed de calendário, desejos e presentes. Um único app Next.js com server actions, Postgres no Neon (Drizzle) e Better Auth, hospedado na Vercel.

## Requisitos

- Node.js na versão do `.nvmrc` (24.22.1). No nvm-windows: `nvm use 24.22.1`.
- pnpm 12.14.0, declarado em `packageManager`.
- Um projeto Neon e a CLI `neon` (`npm i -g neon@latest`, depois `neon login`).

O `.gitattributes` grava texto com LF.

## Primeiro uso

```bash
pnpm install
cp .env.example .env   # antes do neon deploy: ele preenche DATABASE_URL* dentro deste arquivo
neon deploy            # cria o banco e preenche DATABASE_URL* no .env
```

Depois preencha, no `.env`, o que o Neon não preenche:

- `BETTER_AUTH_SECRET`: 32 caracteres ou mais (ex.: `openssl rand -hex 32`).
- `SEED_USER_ONE_*` e `SEED_USER_TWO_*`: e-mail e senha dos 2 usuários (não existe cadastro).
- `COUPLE_DATING_STARTED_ON` e `COUPLE_MARRIED_ON` (`YYYY-MM-DD`, opcionais).

```bash
pnpm db:migrate
pnpm db:seed         # cria os 2 usuários e o casal (idempotente)
pnpm dev             # http://localhost:3100
```

Na Vercel, defina as mesmas variáveis; `BETTER_AUTH_URL` precisa ser `https`.

## Comandos

- `pnpm dev`, `pnpm build`, `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm test`
- `pnpm format` e `pnpm format:check`
- `pnpm db:generate <nome>` / `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio`

## Onde ler

- Arquitetura e decisões: [`docs/adr/0005-nextjs-unico.md`](docs/adr/0005-nextjs-unico.md)
- Autenticação: [`docs/auth.md`](docs/auth.md)
- Convenções: [`docs/conventions/`](docs/conventions)
- Agentes: [`AGENTS.md`](AGENTS.md)
