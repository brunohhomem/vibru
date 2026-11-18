# Ferramentas

## Versões

Node 24.22.1 (`.nvmrc`), pnpm 12.14.0, Next 16.4.6 (Turbopack), React 19.3.1, TypeScript 6.0.3, zod 4.6.7, TanStack Query 5, Vitest 5, Better Auth 1.7. As versões do ESLint e do TypeScript ficam fixadas sem intervalo.

O ESLint fica no 9.39.5: o `eslint-config-next` 16 depende de plugins (`import`, `jsx-a11y`, `react`) que só declaram suporte até o ESLint 9, e o Unicorn 65 é o que roda com ele. Gatilho de revisão: subir para o ESLint 10 quando o `eslint-config-next` aceitar. O TypeScript 7 espera o `typescript-eslint` aceitá-lo.

`pnpm-workspace.yaml` aplica `engineStrict` e libera os scripts nativos que precisam rodar (`esbuild`, `unrs-resolver`). Rode `pnpm audit --prod` de tempos em tempos: avisos de segurança do Next saem em patches.

## ESLint

Os presets ficam em `config/eslint/` (`base.mjs`, `next.mjs`) e o `eslint.config.mjs` da raiz os usa.

- Fluxo, nomes, async e métricas no preset `base`. As métricas (`complexity`, `max-lines-per-function`, `max-lines`, `max-params`, `max-depth`) são avisos; erro é o que bloqueia o commit e o CI.
- `no-floating-promises` e `no-misused-promises` usam `projectService`: arquivo novo precisa estar no `include` do `tsconfig.json`.
- `unicorn/filename-case` exige kebab-case e ignora segmentos dinâmicos `[...]` e `.d.ts`.
- `@typescript-eslint/naming-convention`: camelCase no padrão, PascalCase em tipos, funções e imports, `UPPER_CASE` em constantes. Chaves de objeto com hífen (`'cache-control'`) não passam: monte cabeçalhos com `Headers`.
- `no-nested-ternary`: extraia uma função pequena.
- O preset `next` bloqueia `'use client'` e hooks fora de `*.client.tsx`, `hooks/` e `components/ui`. No flat config, cada item de `files` é um OR; a exclusão entra como array interno (AND).
- `eslint-comments/require-description`: `eslint-disable` só com descrição (e as regras do `AGENTS.md` pedem para não usar para satisfazer métrica).

## TypeScript

O `tsconfig.json` estende `config/tsconfig/next.json` e inclui `src/**`, `next.config.ts`, `neon.ts` e `drizzle.config.ts`. O alias é `@/*` → `src/*` (também no Vitest).

## Git e CI

- Husky: `pre-commit` roda o `lint-staged` (ESLint + Prettier nos arquivos staged); `commit-msg` roda o commitlint (Conventional Commits, linhas do corpo com até 100 caracteres).
- CI (`.github/workflows/ci.yml`): um job `verify` com instalação travada, checagem de fim de linha (LF), `format:check`, `lint`, `typecheck`, `test`, `build` e commitlint nas PRs. Precisa estar verde para o merge.
- O `next build` imprime às vezes um aviso de segurança do Next e sai com erro na primeira vez; uma segunda execução passa. Prefira atualizar o Next quando houver patch.
