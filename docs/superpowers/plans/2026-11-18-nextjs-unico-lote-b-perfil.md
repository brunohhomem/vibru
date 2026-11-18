# Lote B — perfil, senha, link-preview e limpeza de auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Portar `people` (perfil), troca de senha, redefinição da senha do outro usuário e `link-preview` para o Next, e apagar do frontend o que o modelo de 2 usuários sem papéis torna morto (cadastro, convite, usuários, configurações de cadastro).

**Architecture:** Mesmo padrão do Lote A: funções puras com teste, actions finas via `defineAction`/`defineMemberAction`, hooks TanStack Query sobre `unwrapActionResult`. Senha via Better Auth (`auth.api.changePassword`) e hash do Better Auth (`auth.$context`) para a redefinição do outro usuário.

**Tech Stack:** Next 16, Better Auth 1.7, Drizzle/Neon, zod 4, Vitest.

**Spec:** `docs/specs/N2-dominios.md` (lote B), `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md`.

## Global Constraints

- Toda action passa por `defineAction` ou `defineMemberAction`; dado de fora entra como `unknown` e é validado com zod.
- Sem banco de teste: verificação = testes unitários, lint, typecheck, build e passada manual.
- Zod de domínio sai de `legacy/shared` para `src/features/<feature>/schemas`. Sem `eslint-disable`.
- Mobile-first; `page.tsx`/`layout.tsx` sem `'use client'`; hooks só em `*.client.tsx`/`hooks/`.
- Mensagens ao usuário em português, iguais às de hoje.

## Rulings (decididos ao planejar)

- **Home em bento não tem trabalho no lote B.** Ela só consome hooks de tarefas, listas, agenda e desejos (lotes C e E) e funções puras já testadas. Religa-se sozinha quando esses lotes trocarem os hooks.
- **`/app/settings` e `registration_enabled` saem.** O toggle só existe para controlar o cadastro, que não existe mais. A tabela `system_settings` continua no schema como ponto de extensão (design, linha 53); a tela volta quando houver a primeira configuração real. Custo se errado: recriar uma tela vazia.
- **`link-preview` vira módulo de servidor sem action.** No legado só `gifts`/`wishes` o chamam (lote E). Porta-se o serviço e o teste agora; o lote E o consome.
- **Perfil grava com upsert.** O seed não cria linha em `people`; a primeira gravação cria. Leitura sem linha devolve `fullName` vazio, como o legado.
- **Redefinir a senha do outro** (design, linha 83) entra aqui, na tela de perfil, e marca `mustChangePassword` no outro usuário.

## Review Focus

- CPF já usado pelo outro usuário vira erro no campo `cpf` ("CPF já cadastrado"), sem vazar a linha do outro.
- Perfil enviado só com `phone` não apaga `fullName` nem `cpf`.
- Trocar a senha com a senha atual errada falha em `currentPassword`, não desloga e não limpa `mustChangePassword`.
- Redefinir a senha do outro: sem vínculo ao casal falha; nunca altera a própria conta.
- `link-preview`: IP bloqueado, redirect para IP bloqueado, esquema não-http e corpo acima de 1 MB devolvem `null`.

---

### Task 1: link-preview (módulo de servidor)

**Files:**

- Create: `src/features/link-preview/blocked-address.ts`, `og-image.ts`, `og-image-service.ts`, `og-image.spec.ts`
- Source: `legacy/api/src/modules/link-preview/*`

**Interfaces:**

- Produces: `findOgImageUrl(url: string): Promise<string | null>` exportado de `og-image-service.ts` (instancia `OgImageService` padrão), mais `class OgImageService`, `isBlockedAddress`, `extractOgImageUrl` com as assinaturas atuais.

- [ ] **Step 1:** Copiar `blocked-address.ts`, `og-image.ts`, `og-image.service.ts` (renomear para `og-image-service.ts`) e `og-image.spec.ts`; ajustar imports. Remover o `@Injectable`/módulo Nest (não há; é classe simples) e exportar `findOgImageUrl`.
- [ ] **Step 2:** `pnpm vitest run src/features/link-preview` — Expected: PASS com os mesmos casos do legado (IP bloqueado, redirect, limite de 1 MB, timeout).
- [ ] **Step 3:** `pnpm lint && pnpm typecheck`; commit `feat(link-preview): port og-image service`.

### Task 2: Tabela `people`, schemas e regras puras do perfil

**Files:**

- Create: `src/db/people-schema.ts` (+ export em `src/db/schema.ts`), migration `0004_people` (via `pnpm db:generate`), `src/features/profile/schemas.ts`, `src/features/profile/profile-response.ts`, `src/features/profile/profile-response.spec.ts`, `src/features/profile/schemas.spec.ts`
- Source: `legacy/shared/src/auth/schemas.ts` (`fullNameSchema`, `cpfSchema`, `phoneSchema`, `passwordSchema`, `changePasswordRequestSchema`), `legacy/shared/src/people.ts`

**Interfaces:**

- Produces: `people` table (`...coreColumns`, `userId text` FK → `user.id` cascade, `fullName text not null`, `cpf text` unique, `phone text`, unique `user_id`); `updateProfileSchema`, `changePasswordSchema`, `resetPartnerPasswordSchema` (`{ newPassword }`), `ProfileResponse = { email: string; fullName: string; cpf: string | null; phone: string | null }`; `buildProfileResponse(row: { email: string; fullName: string | null; cpf: string | null; phone: string | null }): ProfileResponse`; `buildProfileUpdates(input: UpdateProfileInput): { fullName?: string; cpf?: string; phone?: string }` (só campos enviados).

- [ ] **Step 1 (RED):** specs: CPF válido/inválido/dígitos repetidos, telefone 10 e 11 dígitos, senha curta/sem dígito/sem letra/mais de 72 bytes, `buildProfileResponse` com `fullName` nulo → `''`, `buildProfileUpdates({ phone })` → só `phone`. Rodar e ver falhar.
- [ ] **Step 2:** Implementar schemas (copiando as regras do legado) e as duas funções puras. Rodar os specs — Expected: PASS.
- [ ] **Step 3:** Criar `people-schema.ts`, exportar em `schema.ts`, `pnpm db:generate people`, conferir o SQL e `pnpm db:migrate`.
- [ ] **Step 4:** lint, typecheck; commit `feat(profile): people table and pure profile rules`.

### Task 3: Actions do perfil e tela ligada

**Files:**

- Create: `src/features/profile/profile-repository.ts`, `src/features/profile/actions.ts`, `src/features/profile/hooks/use-profile.ts`
- Modify: `src/features/profile/components/profile-screen.client.tsx`

**Interfaces:**

- Consumes: `defineAction`, `ActionFailure`, `unwrapActionResult`, `buildProfileResponse`, `buildProfileUpdates`, `updateProfileSchema`.
- Produces: `getProfileAction(): ActionResult<ProfileResponse>`, `updateProfileAction(input): ActionResult<ProfileResponse>` (CPF de outro usuário → `ActionFailure('failed', 'CPF já cadastrado', 'cpf')`); `PROFILE_QUERY_KEY`, `useProfile()`.

- [ ] **Step 1:** Repositório: `findProfileByUserId`, `findCpfOwnerExcluding(cpf, userId)`, `upsertProfile(userId, updates)` (insert com `fullName` obrigatório: se não há linha e `fullName` não veio, usa o nome do membro/e-mail local; decisão registrada no código por comentário de uma linha).
- [ ] **Step 2:** Actions finas sobre as funções puras; tela troca `api` por `useProfile`/`updateProfileAction`, erro de campo via `ActionResultError.field`.
- [ ] **Step 3:** lint, typecheck, `pnpm test`; commit `feat(profile): profile actions and screen`.

### Task 4: Troca de senha e redefinição da senha do outro

**Files:**

- Create: `src/features/auth/password-actions.ts`, `src/features/auth/password-rules.ts` + `password-rules.spec.ts`
- Modify: `src/features/auth/components/password-form.client.tsx`, `change-password-screen.client.tsx`, `src/features/profile/components/profile-screen.client.tsx`

**Interfaces:**

- Produces: `changePasswordAction({ currentPassword, newPassword }): ActionResult<{ mustChangePassword: false }>`; `resetPartnerPasswordAction({ newPassword }): ActionResult<null>` (member action); `findPartnerUserId(members, myUserId): string | null` pura.

- [ ] **Step 1 (RED):** `password-rules.spec.ts`: `findPartnerUserId` com 2 membros devolve o outro; com 1 membro devolve `null`; nunca devolve o próprio id.
- [ ] **Step 2:** Implementar `findPartnerUserId`. Rodar — PASS.
- [ ] **Step 3:** `changePasswordAction`: `auth.api.changePassword({ headers, body: { currentPassword, newPassword, revokeOtherSessions: true } })`; senha atual errada → `ActionFailure('invalid_input', 'Senha atual incorreta.', 'currentPassword')`; sucesso limpa `mustChangePassword` do usuário via Drizzle e a tela invalida `ME_QUERY_KEY`.
- [ ] **Step 4:** `resetPartnerPasswordAction`: via `defineMemberAction`, acha o parceiro, hash com `(await auth.$context).password.hash`, atualiza `account.password` do provider `credential` e marca `mustChangePassword = true`; revoga as sessões do parceiro. Card "Redefinir a senha de <nome>" na tela de perfil.
- [ ] **Step 5:** lint, typecheck, test, build; commit `feat(auth): change own password and reset partner password`.

### Task 5: Limpeza do que ficou morto

**Files:**

- Delete: `src/app/{accept-invite,confirm-email,forgot-password,register,reset-password}`, `src/app/app/{users,settings}`, `src/features/users`, `src/features/settings`, componentes de auth sem rota (`accept-invite-form`, `confirm-email`, `forgot-password-form`, `register-form`, `reset-password-form`), `src/features/auth/schemas/forms` partes de cadastro se ficarem sem uso.
- Modify: `src/components/layout/couple-menu.client.tsx` (sem `isAdmin`, sem Usuários/Configurações), `src/components/layout/app-shell.client.tsx`, `src/proxy.ts` (se citar rotas removidas).

- [ ] **Step 1:** Apagar os arquivos acima; `pnpm typecheck` aponta o que referenciava. Corrigir menu e shell.
- [ ] **Step 2:** `rg "role === 'admin'|usePublicSettings|/auth/register|accept-invite"` em `src` — Expected: sem ocorrências.
- [ ] **Step 3:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`; commit `refactor: remove signup, invite, users and settings screens`.

### Task 6: Passada manual e revisão final

- [ ] **Step 1:** `pnpm dev`; logar, editar nome/CPF/telefone no perfil, tentar o CPF inválido, trocar a senha e voltar à original, conferir que o menu não mostra Usuários/Configurações. Reverter qualquer dado alterado.
- [ ] **Step 2:** Revisão final com subagente Opus, correção em uma passada, PR e CI.
