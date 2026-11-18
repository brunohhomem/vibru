# Spec N1 — Esqueleto Next.js único

| Campo     | Valor                                                               |
| --------- | ------------------------------------------------------------------- |
| ADR       | `docs/adr/0005-nextjs-unico.md` (aceito)                            |
| Plano     | `docs/superpowers/plans/2026-11-18-nextjs-unico-fase1-esqueleto.md` |
| Branch/PR | `feat/nextjs-unico-fase1`. Merge na `main` só depois da N2          |

## Objetivo

App Next.js único na raiz com Postgres, Drizzle, Better Auth, login e seed dos 2 usuários. `apps/api` e `packages/*` vão para `legacy/` como referência até a N3.

## Entregas

1. Achatar o repositório (`apps/web` para a raiz; `legacy/`).
2. Env tipado e compose só com Postgres.
3. Drizzle e cliente de banco.
4. Better Auth (e-mail e senha, sessão de 90 dias, rate limit em banco).
5. Seed idempotente dos 2 usuários.
6. Login, `proxy.ts` e wrapper `defineAction`.
7. E2E de login.

## Fora desta fase

Portar domínios (N2); apagar `legacy/`, reduzir CI e docs, regra de ESLint de camadas, `user:reset-password` e troca de senha no perfil (N2/N3).
