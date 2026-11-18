# Spec N2 — Portar os domínios para server actions

| Campo     | Valor                                                           |
| --------- | --------------------------------------------------------------- |
| ADR       | `docs/adr/0005-nextjs-unico.md` (aceito)                        |
| Branch/PR | Uma branch e uma PR por lote. CI verde antes do merge           |
| Base      | N1 mergeada (PR #10). `legacy/` é a referência de comportamento |

## Objetivo

Cada módulo de `legacy/api` vira `src/features/<feature>` com `actions.ts`, funções puras testadas e componentes ligados às actions. O comportamento visível ao usuário não muda. Ao fim do último lote, as telas voltam a funcionar sem a API NestJS.

## Regras do lote

1. **Pura primeiro.** Regra de negócio (datas, agrupamentos, cálculos, validações) vive em funções puras com teste unitário. A action só lê o banco, chama a função pura e grava.
2. **Toda action passa por `defineAction` ou `defineMemberAction`** (sessão e vínculo ao casal validados antes de qualquer acesso ao banco). Dado de fora entra como `unknown` e é validado com zod.
3. **Sem banco de teste** (ADR 0005): a verificação é teste unitário, lint, typecheck, build e uma passada manual no navegador contra o banco de desenvolvimento.
4. Cada lote remove do frontend o uso de `api` (axios) dos seus endpoints e apaga o que ficou morto.
5. Schemas zod de domínio saem de `legacy/shared` para `src/features/<feature>/schemas.ts` no lote do domínio.

## Lotes

| Lote | Conteúdo                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------- |
| A    | Base (`defineMemberAction`), casal e membros, seed do casal, religar o shell do `/app`            |
| B    | Perfil (`people`), configurações, link-preview, home em bento                                     |
| C    | Tarefas e listas                                                                                  |
| D    | Saúde e medicações                                                                                |
| E    | Agenda, feed ICS, desejos e presentes                                                             |
| F    | Limpeza (N3): apagar `legacy/`, `axios`, `api.ts`, docs, regra de ESLint de camadas e `AGENTS.md` |

Ordem fina de cada lote: decidida no plano do lote.
