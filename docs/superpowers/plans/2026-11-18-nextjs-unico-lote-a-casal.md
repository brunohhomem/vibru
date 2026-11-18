# Fase 2, Lote A (base e casal): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O shell do `/app` volta a carregar (sessão e casal por server actions), a tela de configurações do casal funciona, e existe o wrapper `defineMemberAction` que os próximos lotes reutilizam.

**Architecture:** Tabelas `couples` e `couple_members` em Drizzle (user id `text`, vindo do Better Auth). Regra de negócio em funções puras (`buildCoupleResponse`, `findCoupleDateIssues`). Actions finas em `src/features/couple/actions.ts` via `defineMemberAction`. Seed cria o casal e os 2 membros.

**Tech Stack:** Next 16, Drizzle, Better Auth, zod 4, TanStack Query 5, Vitest 5.

**Spec:** `docs/specs/N2-dominios.md` (regras do lote) e `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md`. Referência de comportamento: `legacy/api/src/modules/couple/*`.

## Global Constraints

- Sem banco de teste: regra em função pura com teste unitário; actions finas.
- Toda action passa pelo wrapper; sessão e vínculo validados antes do banco.
- Datas de calendário são `string` `YYYY-MM-DD` (nunca `Date`); "hoje" é `todayInSaoPaulo` (de `@vibru/shared`).
- `null` em `datingStartedOn`/`marriedOn` apaga a data; `undefined` não mexe no campo.
- Regras do `AGENTS.md` (guard clause, nomes completos, `page.tsx` sem `'use client'`, hooks só em `*.client.tsx`/`hooks/`).
- `getDatabase()` e `getEnv()` continuam lazy.

## Review Focus

- Usuário logado sem membro de casal recebe `couple_required` (não exceção) e o shell mostra a tela de casal obrigatório.
- Datas no futuro, casamento antes do namoro e `null` para apagar: erro tipado com o campo certo.
- Cor do membro única por casal e um usuário em um só casal (índices únicos do schema).
- Seed com data de casamento antes do namoro falha antes de gravar; rodar duas vezes não duplica casal nem membros.

---

### Task 1: Lógica pura do casal

**Files:**

- Create: `src/features/couple/couple-response.ts`, `src/features/couple/couple-response.spec.ts`, `src/features/couple/couple-dates.ts`, `src/features/couple/couple-dates.spec.ts`

**Interfaces:**

- Produces:
  - `type CoupleRecord = { id: string; datingStartedOn: string | null; marriedOn: string | null }`
  - `type MemberRecord = { id: string; displayName: string; color: 'blue' | 'purple' }`
  - `function buildCoupleResponse(input: { couple: CoupleRecord; members: MemberRecord[]; currentMemberId: string; today: string }): CoupleResponse` (tipo de `@vibru/shared`)
  - `type CoupleDateIssue = { field: 'datingStartedOn' | 'marriedOn'; message: string }`
  - `function findCoupleDateIssues(dates: { datingStartedOn: string | null; marriedOn: string | null }, today: string): CoupleDateIssue[]`
  - `function mergeCoupleDates(current: CoupleDates, patch: { datingStartedOn?: string | null; marriedOn?: string | null }): CoupleDates` (`undefined` mantém, `null` apaga)

- [ ] **Step 1: Write the failing tests.** `couple-dates.spec.ts`: namoro e casamento amanhã devolvem as mensagens "O início do namoro não pode estar no futuro" e "O casamento não pode estar no futuro" com o campo certo; casamento antes do namoro devolve "O casamento não pode ser antes do início do namoro" em `marriedOn`; datas válidas devolvem `[]`; `mergeCoupleDates` com `{ marriedOn: null }` apaga só o casamento e com `{}` mantém tudo. `couple-response.spec.ts`: sem casamento, `married`, `nextWeddingAnniversary` e `nextDatingAnniversary` são `null`; com casamento em `2020-06-15` e hoje `2026-11-18`, `nextWeddingAnniversary` é `{ date: '2027-06-15', years: 7, bodasName: bodasName(7), daysUntil: 209 }`; `isMe` só é `true` para `currentMemberId`; ordem dos membros preservada.
- [ ] **Step 2:** `pnpm vitest run src/features/couple` e ver FAIL ("Failed to resolve import").
- [ ] **Step 3: Implement** as duas funções puras portando `legacy/api/src/modules/couple/couple.service.ts` (`assertDatesAreValid` vira `findCoupleDateIssues` devolvendo a lista em vez de lançar; `buildResponse` vira `buildCoupleResponse` recebendo `today`). Usar `daysBetween`, `elapsedParts`, `nextAnnualOccurrence`, `bodasName` de `@vibru/shared`.
- [ ] **Step 4:** Rodar os specs e ver PASS.
- [ ] **Step 5:** Commit `feat(couple): pure couple response and date rules`.

### Task 2: Tabelas do casal

**Files:**

- Create: `src/db/couple-schema.ts`, migration `0003_couple.sql` via `pnpm db:generate couple`
- Modify: `src/db/schema.ts` (reexporta)

**Interfaces:**

- Produces: `couples`, `coupleMembers` (`user_id text` referenciando `user.id`, cor `blue|purple` única por casal, `user_id` único, `ics_token_hash` único), tipos `CoupleRow`, `CoupleMemberRow`. Portar de `legacy/api/src/modules/couple/*.entity.ts` usando `coreColumns` de `src/db/core-columns.ts`.

- [ ] **Step 1:** Escrever o schema e gerar a migration.
- [ ] **Step 2:** `pnpm db:migrate` aplica sem erro no Neon; `pnpm typecheck` passa.
- [ ] **Step 3:** Commit `feat(db): couple and couple members tables`.

### Task 3: Wrapper `defineMemberAction`

**Files:**

- Create: `src/features/couple/membership.ts`, `src/lib/define-member-action.ts`, `src/lib/define-member-action.spec.ts`
- Modify: `src/lib/define-action.ts` (novo código `couple_required` em `ActionResult`)

**Interfaces:**

- Consumes: `readSessionUserId` (`src/lib/session.ts`).
- Produces:
  - `type MemberContext = { memberId: string; coupleId: string; color: 'blue' | 'purple' }`
  - `function findMemberContextByUserId(userId: string): Promise<MemberContext | null>` em `membership.ts`
  - `function defineMemberAction<TInput, TData>(config: { schema: z.ZodType<TInput>; handler: (context: { input: TInput; userId: string; member: MemberContext }) => Promise<TData> }): (rawInput: unknown) => Promise<ActionResult<TData>>`
  - `ActionResult` ganha `code: 'couple_required'`.

- [ ] **Step 1: Write the failing test** (mock de `./session` e de `@/features/couple/membership`): sem sessão devolve `unauthenticated`; com sessão e sem membro devolve `couple_required` e o handler não roda; input inválido devolve `invalid_input` sem chamar o handler; sucesso entrega `member` ao handler; exceção vira `failed` sem vazar mensagem.
- [ ] **Step 2:** Rodar e ver FAIL.
- [ ] **Step 3: Implement** reutilizando o mesmo formato de `defineAction` (guard clauses na ordem sessão, membro, zod, handler em try/catch). Extrair o trecho comum só se ficar duplicado em mais de 10 linhas.
- [ ] **Step 4:** Rodar e ver PASS. Commit `feat: member-scoped action wrapper`.

### Task 4: Actions do casal

**Files:**

- Create: `src/features/couple/couple-repository.ts`, `src/features/couple/actions.ts`

**Interfaces:**

- Consumes: `defineMemberAction`, `buildCoupleResponse`, `findCoupleDateIssues`, `mergeCoupleDates`, `updateCoupleRequestSchema` e `updateMyMemberRequestSchema` (de `@vibru/shared`), `todayInSaoPaulo`.
- Produces (`'use server'`): `getCoupleAction()`, `updateCoupleAction(raw)`, `updateMyMemberAction(raw)`, todas devolvendo `ActionResult<CoupleResponse>`. Datas inválidas voltam como `{ ok: false, code: 'invalid_input', message, field }` (o tipo ganha `field?: string`).
- `couple-repository.ts` (único arquivo do lote que importa `drizzle-orm`): `findCoupleById`, `findMembers`, `updateCoupleDates`, `updateMemberDisplayName`, todos com `coupleId` obrigatório.

- [ ] **Step 1:** Implementar o repositório e as 3 actions finas (ler, chamar a função pura, gravar).
- [ ] **Step 2:** `pnpm lint && pnpm typecheck` passam (a regra "componente não importa drizzle" é só convenção até a N3).
- [ ] **Step 3:** Commit `feat(couple): couple server actions`.

### Task 5: Seed do casal

**Files:**

- Create: `src/db/couple-seed-plan.ts`, `src/db/couple-seed-plan.spec.ts`, `src/db/seed-couple.ts`
- Modify: `src/db/seed.ts`, `src/lib/env.ts`, `.env.example`

**Interfaces:**

- Produces:
  - `function planCoupleSeed(input: { users: { id: string; displayName: string }[]; datingStartedOn: string | null; marriedOn: string | null; today: string }): { dates: ...; members: { userId: string; displayName: string; color: 'blue' | 'purple' }[] }` (cor `blue` para o primeiro usuário, `purple` para o segundo; lança se casamento antes do namoro, data no futuro ou diferente de 2 usuários)
  - `function seedCouple(plan): Promise<{ created: boolean }>` idempotente: se os 2 usuários já têm vínculo, não faz nada.
- Env novas (opcionais): `COUPLE_DATING_STARTED_ON`, `COUPLE_MARRIED_ON`.

- [ ] **Step 1: Write the failing test** de `planCoupleSeed`: atribui `blue`/`purple`; casamento antes do namoro lança; menos de 2 usuários lança; datas ausentes viram `null`.
- [ ] **Step 2:** Ver FAIL. **Step 3:** Implementar `planCoupleSeed` e `seedCouple` (transação; `ON CONFLICT DO NOTHING` nos índices únicos). `seed.ts` chama `seedUsers`, busca os 2 usuários pelos e-mails e chama `seedCouple`.
- [ ] **Step 4:** Spec PASS; `pnpm db:seed` duas vezes no banco de dev imprime `couple created` e depois `couple skipped`.
- [ ] **Step 5:** Commit `feat(db): seed the couple and its members`.

### Task 6: Religar o frontend do casal e o shell

**Files:**

- Modify: `src/features/couple/hooks/use-couple.ts`, `src/features/couple/components/couple-settings-screen.client.tsx`, `src/features/couple/components/couple-required-screen.client.tsx`, `src/components/layout/app-shell.client.tsx`, `src/features/auth/hooks/use-me.ts`
- Test: `src/features/couple/hooks/couple-error-state.spec.ts`

**Interfaces:**

- Consumes: `getCoupleAction`, `updateCoupleAction`, `updateMyMemberAction`.
- Produces: `function describeCoupleLoadFailure(result: { code: string }): 'couple-required' | 'redirect-to-login' | 'retry'` (pura, testada) usada pelo shell no lugar do `statusOf(error) === 403/401`.

- [ ] **Step 1: Write the failing test** de `describeCoupleLoadFailure`: `couple_required` vira `'couple-required'`, `unauthenticated` vira `'redirect-to-login'`, qualquer outro vira `'retry'`.
- [ ] **Step 2:** Ver FAIL; implementar.
- [ ] **Step 3:** `useCouple` chama `getCoupleAction` (lança `Error` com o `code` na mensagem quando `!ok`); as mutations da tela de configurações chamam as actions e invalidam `COUPLE_QUERY_KEY`, mostrando o `message` do erro no campo indicado por `field`.
- [ ] **Step 4:** Tirar `axios` e `statusOf` do shell; usar `describeCoupleLoadFailure`.
- [ ] **Step 5:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passam. Commit `feat(couple): wire couple screens and shell to server actions`.

### Task 7: Verificação manual no navegador

- [ ] **Step 1:** `pnpm db:seed`, `pnpm dev`; no navegador (Claude in Chrome): login com o usuário 1 chega no `/app` com "Casados há…" e os 2 membros no menu; `/app/couple` salva uma data e um nome; uma data no futuro mostra o erro no campo; sair e entrar de novo mantém tudo.
- [ ] **Step 2:** Registrar o resultado na descrição da PR do lote.

---

## Self-review

- **Cobertura da spec N2 (lote A):** base `defineMemberAction` (T3), casal e membros (T1, T2, T4), seed (T5), shell religado (T6). Perfil, configurações, link-preview e home ficam no lote B por desenho.
- **Tipos consistentes:** `MemberContext`, `CoupleRecord`, `MemberRecord`, `ActionResult` (+ `couple_required`, `field`) têm uma só definição.
- **Risco:** sem banco de teste, as actions finas não têm teste automático; o risco está contido porque a regra está nas funções puras e há a passada manual da Task 7.
