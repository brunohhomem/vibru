# Lote E — agenda, feed ICS, desejos e presentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Portar `agenda` (eventos, datas importantes, bodas/namoro, próxima data), o feed ICS (público, por token), `wishes` e `gifts` para server actions e um route handler, e religar as telas e a home.

**Architecture:** Igual aos lotes anteriores: regras em funções puras com spec (ocorrências anuais, aniversários, próxima data, entradas do ICS, decisão da imagem), repositórios por função, `defineMemberAction` fino. O feed ICS vira um route handler público `GET /api/ics/[feedFile]` (credencial = token da URL; só o hash SHA-256 fica no banco).

**Tech Stack:** Next 16 (route handlers), Drizzle/Neon, zod 4, TanStack Query 5, Vitest.

**Spec:** `docs/specs/N2-dominios.md` (lote E), `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md`. Referência de comportamento: `legacy/api/src/modules/{agenda,wishes,gifts}`, `legacy/shared/src/{agenda,wishes,gifts}`.

## Global Constraints

- Toda action passa por `defineMemberAction`; todo método de repositório recebe `coupleId` (presentes também o dono da lista). Dado de fora entra como `unknown` e é validado com zod.
- Sem banco de teste: lógica pura com spec; verificação = testes, lint, typecheck, build e passada manual.
- Zod de domínio sai de `legacy/shared` para as features (copiado); sem `eslint-disable`; mensagens em português iguais às do legado.
- **A reserva de presente é segredo do dono:** a resposta ao dono nem contém `reservedByMemberId`/`reservedAt` (esconder só na tela não basta).
- O feed ICS nunca inclui observações dos eventos (é sincronizado em serviços de terceiros) e responde igual para token inexistente, revogado ou malformado.

## Rulings (decididos ao planejar)

- **Módulos copiados, não movidos** (como nos lotes C e D); nomes `agenda-schemas.ts`, `wish-schemas.ts`, `gift-schemas.ts` para não colidir com as pastas `schemas/` das features.
- **ICS como route handler** em `src/app/api/ics/[feedFile]/route.ts`; rotas do filesystem vencem o rewrite para a API legada. Resposta `text/calendar; charset=utf-8`, `Cache-Control: no-store`, 404 sem corpo informativo.
- **Link-preview** (`findOgImageUrl`, lote B) é chamado por desejos e presentes na criação e na edição de URL. A decisão de "buscar ou não" é pura (`decideImageUrl`).
- **Erros de presente** viram `ActionFailure('failed', mensagem)` com as mesmas mensagens do legado ("Só o dono mexe na própria lista", "Você não reserva presentes da própria lista", "Este presente já foi reservado", "Presente não encontrado"); a distinção por status HTTP deixa de existir.
- **Sem remover desejo→evento por FK:** ao excluir um desejo (exclusão lógica), o vínculo `wish_id` dos eventos é limpo na mesma ação, como no legado.

## Review Focus

- O dono nunca recebe campos de reserva, em nenhuma ação (listar, criar, editar, marcar como recebido); quem não é dono não cria, edita, exclui nem marca como recebido.
- Reservar: o dono não reserva a própria lista; duas reservas simultâneas não se sobrescrevem (a segunda falha com "já foi reservado"); só quem reservou desfaz.
- Feed ICS: token válido devolve o calendário do casal certo; token errado, revogado, malformado e arquivo sem `.ics` dão o mesmo 404; regenerar invalida o token anterior; observações nunca aparecem.
- Data importante anual e aniversários (namoro/casamento): 29/02, múltiplos anos no intervalo, só ocorrências ≥ 1 ano, nome das bodas, e a "próxima data" desempata data do casal < data importante < evento, e evento sem horário antes do com horário.
- Editar desejo/presente: imagem manual vence; só URL nova dispara a busca; apagar a URL apaga a imagem; não mexer na URL mantém a imagem.

---

### Task 1: Copiar schemas e helpers para as features

**Files:**

- Create: `src/features/agenda/{agenda-schemas,ics-calendar}.ts` + `ics-calendar.spec.ts`; `src/features/wishes/{wish-constants,wish-schemas}.ts`; `src/features/gifts/{gift-constants,gift-schemas}.ts`
- Modify: imports de `@vibru/shared` em `src/features/{agenda,wishes,gifts,home}` (script `migrate-imports.mjs` do scratchpad, estendido)
- Source: `legacy/shared/src/{agenda,wishes,gifts}/*`, `legacy/api/src/modules/agenda/ics-calendar.ts` (+ spec)

**Interfaces:**

- Produces: mesmos nomes do legado (`agendaMonthSchema`, `createAgendaEventRequestSchema`, …, `Wish`, `Gift*`, `WISH_CATEGORIES`, `GIFT_CATEGORIES`, `httpUrlSchema`, `priceCentsSchema`, `buildIcsCalendar`, `IcsEntry`), agora de `@/features/...`. `z` de `'zod'`; calendário de `@vibru/shared`; `taskDueTimeSchema` de `@/features/tasks/task-schemas`.

- [ ] **Step 1:** Copiar ajustando imports; rodar o script de migração de imports sobre `src/features`.
- [ ] **Step 2:** `pnpm vitest run src/features/agenda` (spec do ICS) — Expected: PASS. typecheck e lint limpos; commit `refactor(agenda,wishes,gifts): domain schemas and helpers into the features`.

### Task 2: Tabelas

**Files:**

- Create: `src/db/wishes-schema.ts`, `src/db/gifts-schema.ts`, `src/db/agenda-schema.ts`; export em `src/db/schema.ts`; migration `0007_agenda_wishes_gifts`
- Source: entidades em `legacy/api/src/modules/{agenda,wishes,gifts}`

**Interfaces:**

- Produces: `wishes` (+ enum `wish_category`), `gifts` (+ enum `gift_category`), `agendaEvents` (tabela `events`, FK `wish_id` → `wishes` `ON DELETE SET NULL`), `importantDates`; tipos `*Row`/`New*Row`. Índices do legado preservados.

- [ ] **Step 1:** Portar para a sintaxe de array de índices; `agenda-schema` importa `wishes-schema`.
- [ ] **Step 2:** `pnpm db:generate agenda_wishes_gifts`, conferir o SQL, `pnpm db:migrate`; typecheck, lint; commit `feat(db): agenda, wishes and gifts tables`.

### Task 3: Regras puras da agenda, do ICS e das imagens

**Files:**

- Create: `src/features/agenda/agenda-entries.ts` + spec, `src/features/agenda/ics-feed-rules.ts` + spec, `src/features/shared/link-image.ts` (ou `src/features/link-preview/decide-image-url.ts`) + spec, mappers `agenda-mappers.ts`, `wish-mappers.ts`, `gift-mappers.ts` + specs

**Interfaces:**

- Produces:
  - `annualOccurrences(origin, range): Array<{ date; years }>`, `importantDateOccurrences(row, range)`, `buildAnniversaries(origin | null, range, kind)`, `buildCalendarEntries(input: { couple: { marriedOn; datingStartedOn }; events; importantDates }, range): CalendarEntries`, `monthRange(month: string): { from; to }`, `pickUpcoming(entries, today): AgendaUpcomingResponse['next']` (janela de 365 dias).
  - `toIcsEntries(entries: CalendarEntries, coupleId: string): IcsEntry[]` (sem notas; UIDs estáveis), `hashFeedToken(token)`, `parseFeedFile(feedFile): string | null` (`/^([A-Za-z0-9_-]{43})\.ics$/`), `generateFeedToken(): string` (32 bytes base64url).
  - `decideImageUrl(current: { url: string | null }, patch: { imageUrl?: string | null; url?: string | null }): { kind: 'keep' } | { kind: 'set'; value: string | null } | { kind: 'lookup'; url: string }`.
  - `toAgendaEvent`, `toImportantDate`, `toWish(row & { plannedOn })`, `toGiftResponse(row, viewerMemberId)` (dono não recebe reserva).

- [ ] **Step 1 (RED):** specs: ocorrência anual (ano de origem, 29/02 em ano não bissexto, vários anos, fora do intervalo); data importante não anual dentro/fora; aniversários só com `years ≥ 1` e títulos ("Bodas de Prata (25 anos)", "1 ano de namoro"); `pickUpcoming` (vazio → `null`, desempate casal < data importante < evento, sem horário antes de com horário, janela de 365 dias); `toIcsEntries` (sem `notes`, UIDs); `hashFeedToken` determinístico; `parseFeedFile` (válido, sem `.ics`, token curto); `generateFeedToken` (43 caracteres base64url, dois tokens diferentes); `decideImageUrl` (manual vence, URL igual mantém, URL nova busca, URL nula apaga, sem URL no patch mantém); `toGiftResponse` (dono não tem `reservedByMemberId`/`reservedAt`, nem como chave; parceiro tem); mappers (ISO, `HH:MM`, `plannedOn`).
- [ ] **Step 2:** Implementar o mínimo; PASS; commit `feat(agenda,wishes,gifts): pure rules and mappers`.

### Task 4: Agenda, feed ICS e route handler

**Files:**

- Create: `src/features/agenda/{agenda-repository,important-dates-repository,actions,ics-feed}.ts`, `actions.spec.ts`, `src/app/api/ics/[feedFile]/route.ts` + `route.spec.ts`
- Modify: `src/features/couple/couple-repository.ts` (`findMemberByIcsTokenHash`, `updateMemberIcsTokenHash`), `hooks/use-agenda.ts`, `hooks/use-agenda-upcoming.ts`, `components/ics-feed-card.client.tsx` se importar axios

**Interfaces:**

- Produces: `getAgendaMonthAction({ month })`, `getAgendaUpcomingAction(undefined)`, `createEventAction`, `updateEventAction({ id, data })`, `removeEventAction({ id })`, `createImportantDateAction`, `updateImportantDateAction`, `removeImportantDateAction`, `getIcsFeedStatusAction`, `regenerateIcsFeedAction → { feedPath }`, `revokeIcsFeedAction`; `renderIcsFeed(feedFile: string): Promise<string | null>`; `GET` do route handler.

- [ ] **Step 1 (RED):** `actions.spec.ts` (repositórios simulados): mês e próxima data usam o casal do membro; evento/data de outro casal ou id malformado → "Item não encontrado" sem gravar; regenerar grava só o hash (nunca o token) e devolve `/api/ics/{token}.ics`; revogar grava `null`. `route.spec.ts`: token válido → 200, `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: no-store`, corpo sem notas; token inexistente, malformado e sem `.ics` → mesmo 404.
- [ ] **Step 2:** Implementar repositórios (`listBetween`, `findActive`, create/update/softDelete, `detachWish`), actions, `renderIcsFeed` (janela `ano-1` a `ano+2`) e o route handler; hooks sobre `unwrapActionResult`; PASS.
- [ ] **Step 3:** lint, typecheck, test, build; commit `feat(agenda): agenda actions, ICS feed route and hooks`.

### Task 5: Desejos

**Files:**

- Create: `src/features/wishes/{wishes-repository,actions}.ts`, `actions.spec.ts`
- Modify: `src/features/wishes/hooks/use-wishes.ts`

**Interfaces:**

- Produces: `listWishesAction({ status })`, `createWishAction`, `updateWishAction({ id, data })`, `removeWishAction({ id })`, `setWishDoneAction({ id, done })`, `planWishAction({ id, data }): AgendaEvent`. Repositório com `plannedOn` (subselect: menor `starts_on` de hoje em diante entre eventos ativos do desejo).

- [ ] **Step 1 (RED):** specs: desejo de outro casal/malformado → "Desejo não encontrado"; criar com URL e sem imagem busca `findOgImageUrl` e grava a imagem encontrada; imagem manual não busca; editar com URL nova busca, URL igual não; apagar a URL apaga a imagem; remover desliga o vínculo dos eventos e exclui o desejo; planejar cria evento com título do desejo e `wishId`; marcar/desmarcar feito.
- [ ] **Step 2:** Implementar; hooks sobre as actions (planejar invalida agenda e desejos); PASS; commit `feat(wishes): wish actions and screens`.

### Task 6: Presentes

**Files:**

- Create: `src/features/gifts/{gifts-repository,actions}.ts`, `actions.spec.ts`
- Modify: `src/features/gifts/hooks/use-gifts.ts`

**Interfaces:**

- Produces: `listGiftsAction({ ownerId, status })`, `createGiftAction({ ownerId, data })`, `updateGiftAction({ ownerId, giftId, data })`, `removeGiftAction`, `markGiftReceivedAction`, `reserveGiftAction`, `releaseGiftAction`. Repositório com `reserve` condicional (`reserved_by_member_id IS NULL`) e `release` só de quem reservou.

- [ ] **Step 1 (RED):** specs: dono de outro casal/malformado → "Presente não encontrado" sem tocar no banco; só o dono cria/edita/exclui/marca recebido ("Só o dono mexe na própria lista"); o dono nunca recebe campos de reserva (listar, criar, editar, recebido); dono não reserva nem libera ("Você não reserva presentes da própria lista"); reserva já feita → "Este presente já foi reservado"; liberar só desfaz a própria reserva; imagem como nos desejos.
- [ ] **Step 2:** Implementar; hooks sobre as actions; PASS; commit `feat(gifts): gift actions and screens`.

### Task 7: Fechamento

- [ ] **Step 1:** `rg "lib/api'" src/features` — Expected: sem ocorrências fora de `src/lib`. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- [ ] **Step 2:** Passada manual pendente do usuário (agenda, datas importantes, feed ICS no celular, desejos com link, presentes e reserva entre os dois usuários).
- [ ] **Step 3:** Revisão final com subagente Opus, correção em uma passada, PR e CI.
