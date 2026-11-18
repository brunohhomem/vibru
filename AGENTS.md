# AGENTS.md

Vibru é um app para duas pessoas (um casal): tarefas, listas, saúde, agenda, desejos e presentes. É um único app Next.js (`src/`) com server actions, Postgres no Neon (Drizzle), Better Auth e deploy na Vercel. Não há API separada, fila, e-mail nem papéis.

## Comandos

- `pnpm dev` (porta 3100), `pnpm build`, `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm test`
- `pnpm format` e `pnpm format:check`
- `pnpm db:generate <nome>` / `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio`

## Fluxo

1. A decisão mora no ADR, em `docs/adr/`.
2. O trabalho mora numa spec em `docs/specs/` e num plano em `docs/superpowers/plans/`.
3. A spec precisa estar aprovada antes da execução.
4. Uma branch e uma PR por trabalho; o CI (`verify`) precisa estar verde antes do merge.

## Regras inegociáveis

1. Responsabilidade única. Regra de negócio em função pura com teste; a action só lê, chama a regra e grava.
2. Nomes descritivos e completos. Comentário explica o porquê, não o quê.
3. Guard clause: valide e falhe no início da função. Evite `else`.
4. Não renomeie para um nome curto, não divida uma função só para caber numa métrica e não use `eslint-disable` para satisfazer uma métrica.
5. Se uma regra de lint conflitar com o código natural, pare, diga qual regra e pergunte.
6. `any` só com `eslint-disable` e uma descrição. Dado de fora entra como `unknown` e é validado com zod.
7. Toda server action passa por `defineAction` ou `defineMemberAction`: sessão e vínculo ao casal são validados antes de qualquer acesso ao banco. Todo método de repositório recebe `coupleId`.
8. `page.tsx` e `layout.tsx` não levam `'use client'`. O que precisa de cliente fica em `*.client.tsx`.
9. Hook só em `*.client.tsx`, em `hooks/` ou em `components/ui`.
10. Mobile-first: o estilo base é o de mobile e só cresce com `min-width`. Variante `max-*` não entra.
11. Sem banco de teste (ADR 0005): a rede de segurança é teste unitário das funções puras, das actions com repositório simulado, lint, typecheck e build.
12. Texto de instrução não substitui o que o ESLint, os testes, o Husky e o CI já impõem.

## Índice

- Ao criar ou alterar UI, leia `DESIGN.md` e `docs/conventions/frontend.md`.
- Server actions, repositórios e regras puras: `docs/conventions/server-actions.md`.
- Banco: `docs/conventions/database.md`.
- Testes: `docs/conventions/testing.md`.
- Versões, ESLint, Husky e CI: `docs/conventions/tooling.md`.
- Autenticação: `docs/auth.md`.
- Decisões: `docs/adr/` (a vigente para a arquitetura é a `0005-nextjs-unico.md`).
