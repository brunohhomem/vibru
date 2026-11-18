# ADR 0005 — Vibru em um app Next.js único

| Campo       | Valor                                                      |
| ----------- | ---------------------------------------------------------- |
| Status      | Aceito em 2026-11-18                                       |
| Data        | 2026-11-18                                                 |
| Substitui   | Parcialmente os ADRs 0001 e 0002 (estrutura)               |
| Decisor     | Bruno                                                      |
| Design base | `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md` |

---

## 1. Contexto

O Vibru é um app pessoal para 2 pessoas. A estrutura atual (monorepo pnpm com API NestJS, Redis, worker BullMQ, e-mail e papéis) é grande demais para esse uso.

## 2. Decisão

1. **App único** Next.js na raiz. Sem `apps/`, `packages/` nem turbo.
2. **Better Auth** só com e-mail e senha, sem plugins e sem papéis.
3. **Sem e-mail:** sem cadastro, convite, confirmação nem reset por e-mail. Os 2 usuários vêm do seed.
4. **Sem dados a preservar:** o banco é recriado do zero.
5. **Vercel** como hospedagem; por isso tudo fica no Next e só o Postgres é infra.
6. **Sem papéis, administração de usuários e log de auditoria.** O `/settings` fica como ponto de extensão.
7. Server actions substituem os controllers HTTP; TanStack Query cuida de cache e mutações no cliente.

## 3. Consequências

- Saem: `apps/api`, `packages/*`, Redis, BullMQ, worker, Mailpit, Swagger, guards de papel.
- Cada ação autenticada valida a sessão antes de acessar o banco (wrapper único `defineAction`).
- A migração é feita em 3 fases: esqueleto (N1), domínios (N2) e limpeza (N3). Entre N1 e N2 as telas de domínio ficam fora do ar; a branch só vai para a `main` depois da N2.
