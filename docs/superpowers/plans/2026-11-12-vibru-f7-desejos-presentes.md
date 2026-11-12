# Vibru F7 — Desejos e Presentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba Desejos, com desejos do casal e a aba interna Presentes com reserva oculta para o dono, buscando o `og:image` da URL com proteção contra SSRF.

**Architecture:** Três módulos novos na API:

- `link-preview`: busca o `og:image`. É uma função de segurança isolada e não conhece o domínio.
- `wishes`: desejos do casal. "Planejar" cria um evento da Agenda com `events.wish_id`.
- `gifts`: presentes por membro. A resposta é montada conforme quem pede.

No web, `features/wishes` e `features/gifts` ficam sob a rota `/app/wishes`, com abas Desejos e Presentes.

**Tech Stack:** NestJS 12, Drizzle, `node:http`/`node:https`/`node:dns`/`node:net` (sem dependência nova), Next.js, TanStack Query, Vitest, Playwright.

**Spec:** sem spec, por decisão do Bruno. A referência é o ADR 0003: seção 2 (itens 5 e 6), seção 3 (itens 9 a 12), seção 4 (itens 1, 2 e 4), seção 6 (item 4) e seção 7 (Presentes e Desejos). Esta é a fase F7 do ADR 0004, seção 6.

## Global Constraints

- Branch `feat/vibru-f7-desejos-presentes`, criada da `main` depois do merge da F6.
- Dependências novas: nenhuma. Parsing de HTML por regex no `<head>`; IPs bloqueados com `net.BlockList`.
- Recurso de outro casal responde 404, nunca 403 (ADR 0003, 4.1).
- O ICS nunca inclui presentes nem reservas (ADR 0003, 4.4).
- Valor em centavos (`integer`), exibido em BRL com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Categorias de desejo: filme, música, viagem, fazer a dois, ideia de rolê, outro. Enum `wish_category`: `movie`, `music`, `travel`, `together`, `date_idea`, `other`.
- Categorias de presente: roupa, acessório, outro. Enum `gift_category`: `clothing`, `accessory`, `other`.
- `og:image`: só `http` e `https`; DNS resolvido e bloqueio de IP privado, loopback, link-local e metadata, inclusive depois de redirect; no máximo 3 redirects; resposta limitada a 1 MB; só o `<head>` é lido; timeout de 3 s; em falha, salva sem imagem.
- **Imagem manual (pedido do Bruno, 2026-11-12):** desejo e presente aceitam `imageUrl` informado pelo membro (`http` ou `https`, até 2000 caracteres). O servidor só guarda o link e nunca o busca; o navegador carrega a imagem. Upload de arquivo continua na v2 (ADR 0003, seção 2).
  - Quando o `imageUrl` vem no corpo, ele vence e não há busca de `og:image`.
  - Quando só a `url` muda, a busca roda de novo.
  - `imageUrl: null` remove a imagem.
- Testes: casos de uso por integração. Teste unitário só para as funções puras de segurança (`isBlockedAddress`, `extractOgImageUrl`), como as funções de data do `shared`.
- O e2e não pode fazer login novo: os 5 logins já estão em uso. Desejos entra no teste do admin, e a reserva de presente fica só na integração.
- Gate, commits, `-m` e commitlint: iguais ao plano da F6.

## Review Focus

1. Redirect de um host público para `169.254.169.254`: precisa parar no salto, sem requisição. Teste na Task 1.
2. DNS rebinding, com o host resolvendo para IP público na checagem e privado na conexão: a conexão usa o IP já validado (`lookup` fixo). Teste na Task 1, com `lookup` injetado.
3. `og:image` com caminho relativo, ou com `javascript:`/`data:`: o relativo é resolvido contra a URL final; esquema fora de `http`/`https` vira `null`. Teste na Task 1.
4. Dono do presente lendo um item que a parceira reservou, por qualquer rota (lista, detalhe, resposta do `PATCH`): nunca vê `reservedByMemberId` nem `reservedAt`. Teste na Task 3.
5. Desejo planejado e depois apagado: o evento continua na Agenda, com `wish_id` nulo (FK `ON DELETE SET NULL`, desejo em soft delete). Teste na Task 2.

---

### Task 1: Busca protegida do `og:image`

**Files:**

- Create: `apps/api/src/modules/link-preview/blocked-address.ts`
- Create: `apps/api/src/modules/link-preview/og-image.ts`
- Create: `apps/api/src/modules/link-preview/og-image.service.ts`
- Create: `apps/api/src/modules/link-preview/link-preview.module.ts`
- Test: `apps/api/src/modules/link-preview/og-image.spec.ts`
- Test: `apps/api/test/link-preview.int-spec.ts`

**Interfaces:**

- Produces:
  - `isBlockedAddress(address: string): boolean`. Bloqueia:
    - IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `224.0.0.0/4`, `240.0.0.0/4`;
    - IPv6: `::/128`, `::1/128`, `fc00::/7`, `fe80::/10`, `ff00::/8` e IPv4 mapeado em IPv6 (`::ffff:a.b.c.d`), avaliado pela regra do IPv4.
  - `extractOgImageUrl(headHtml: string, pageUrl: string): string | null`. Aceita `property` e `content` em qualquer ordem e com aspas simples ou duplas; resolve contra `pageUrl`; devolve `null` se o esquema não for `http` ou `https`.
  - `OgImageService.findImageUrl(url: string): Promise<string | null>`. Nunca lança erro; falha vira `null`.
  - Construtor: `OgImageService(options?: { lookup?: LookupFunction; connectOverride?: (address: string) => string; timeoutMs?: number })`. As opções são injetáveis só no teste: o Nest registra o serviço sem opções, por `useFactory`.
  - `LinkPreviewModule` exporta `OgImageService`.

- [ ] **Step 1: Escrever os testes unitários das funções puras**

Arquivo `og-image.spec.ts`, com estes casos:

- `isBlockedAddress('10.1.2.3')`, `('127.0.0.1')`, `('169.254.169.254')`, `('::1')`, `('::ffff:192.168.0.1')` e `('fd00::1')` → `true`.
- `isBlockedAddress('93.184.216.34')` e `('2606:2800::1')` → `false`.
- `extractOgImageUrl('<meta content="/a.jpg" property="og:image">', 'https://x.com/p')` → `'https://x.com/a.jpg'`.
- `extractOgImageUrl` com `content='javascript:alert(1)'` → `null`.
- `extractOgImageUrl` sem a meta → `null`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @vibru/api exec vitest run src/modules/link-preview`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar `blocked-address.ts` e `og-image.ts`**

Use um `net.BlockList` montado uma vez no módulo, com `addSubnet` por faixa.

- [ ] **Step 4: Escrever o teste de integração da busca**

Arquivo `link-preview.int-spec.ts`. Um `http.createServer` em `127.0.0.1` conta as requisições recebidas. Casos:

- **"Busca para IP interno não sai do servidor":** `findImageUrl('http://127.0.0.1:<porta>/')` devolve `null`, com zero requisições.
- **"Redirect para IP interno é bloqueado":** o `lookup` injetado devolve `93.184.216.34` para `publico.test` na checagem, e a conexão vai ao servidor local. Para isso, o teste injeta também `connectOverride: (address) => '127.0.0.1'`, só no teste. O servidor responde `302 Location: http://169.254.169.254/`. Resultado `null`, com uma única requisição recebida.
- **"Mais de 3 redirects":** devolve `null`.
- **"Resposta acima de 1 MB":** a leitura para em 1 MB e devolve `null`.
- **"Página válida":** com `lookup` mapeando `publico.test` para o servidor local, encontra o `og:image`.

- [ ] **Step 5: Implementar `OgImageService.findImageUrl`**

Algoritmo, que o teste não determina sozinho:

```text
url atual = url; repita até 4 vezes (1 + 3 redirects):
  rejeite protocolo fora de http/https
  resolva todos os endereços via lookup(host, { all: true }); qualquer bloqueado → null
  faça http(s).request com lookup fixo no primeiro endereço validado,
    header Accept: text/html, signal de AbortSignal.timeout(restante dos 3 s)
  3xx com Location → url atual = new URL(location, url atual); continue
  2xx → leia chunks até </head>, ou até 1 MB (acima disso → null); extractOgImageUrl
qualquer erro → null
```

- [ ] **Step 6: Rodar unitários e integração**

Run: `pnpm --filter @vibru/api exec vitest run src/modules/link-preview` e `pnpm --filter @vibru/api exec vitest run -c vitest.integration.config.mjs test/link-preview.int-spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit** `feat(api): protected og:image lookup`

### Task 2: Desejos na API, com "Planejar"

**Files:**

- Create: `packages/shared/src/wishes/{constants,schemas,index}.ts`; exportar em `packages/shared/src/index.ts`
- Create: `apps/api/src/modules/wishes/{wish.entity,wishes.repository,wishes.service,wishes.controller,wishes.module,wish.mapper}.ts`
- Modify: `apps/api/src/modules/agenda/agenda.entity.ts`, adicionando `wishId: uuid('wish_id').references(() => wishes.id, { onDelete: 'set null' })`
- Modify: `apps/api/src/modules/agenda/agenda.mappers.ts` (`wishId`); `packages/shared/src/agenda/schemas.ts` (`agendaEventSchema.wishId: uuid | null`)
- Modify: `apps/api/src/modules/agenda/agenda.module.ts`, exportando `AgendaEventsRepository`
- Modify: `apps/api/src/database/schema.ts`, `apps/api/src/app.module.ts`, `apps/api/test/test-app.module.ts`
- Migration: `pnpm db:generate create_wishes`
- Test: `apps/api/test/desejos.int-spec.ts`

**Interfaces:**

- Consumes: `OgImageService.findImageUrl` (Task 1); `AgendaEventsRepository.create(data: NewAgendaEventRow)`.
- Produces:
  - Tabela `wishes`: `coreColumns`, `couple_id`, `title` (1–120), `category wish_category`, `url` (nulo), `image_url` (nulo), `price_cents integer` (nulo, ≥ 0), `notes` (nulo, até 500), `done_at timestamptz` (nulo).
  - `Wish = { id, title, category, url, imageUrl, priceCents, notes, doneAt, plannedOn: CalendarDate | null, createdAt }`, em que `plannedOn` é o menor `starts_on` ativo, igual ou posterior a hoje, entre os eventos ligados ao desejo.
  - Rotas sob `/api/wishes`: `GET` (`?status=open|done`, padrão `open`), `POST`, `PATCH /:wishId`, `DELETE /:wishId`, `POST /:wishId/done`, `DELETE /:wishId/done`, `POST /:wishId/plan` com `{ startsOn, startTime? }`, que responde `AgendaEvent`.
  - Erro: `WISH_NOT_FOUND` (404).

- [ ] **Step 1: Escrever os casos de uso em `desejos.int-spec.ts`**

- "Membro cria, edita e remove desejo; a parceira vê."
- "Membro salva um desejo com URL que aponta para IP interno": `url: 'http://127.0.0.1:<porta de um servidor de teste>/'` → 201, `imageUrl: null`, zero requisições no servidor.
- "Membro informa a imagem manualmente quando a busca falha": depois de salvar com URL de IP interno (`imageUrl: null`), `PATCH { imageUrl: 'https://img.exemplo.com/a.jpg' }` grava o link, sem requisição. `imageUrl: 'javascript:alert(1)'` → 400.
- "Membro marca desejo como feito": sai de `open` e aparece em `done`; desfazer volta.
- "Membro planeja um desejo": `POST /plan { startsOn: '2026-12-20', startTime: '19:00' }` → evento com `wishId` e o título do desejo; `GET /agenda?month=2026-12` mostra o evento; `plannedOn` do desejo = `'2026-12-20'`.
- "Desejo planejado é removido": o evento continua na Agenda, com `wishId: null`.
- "Membro salva preço negativo, categoria inválida ou URL sem http": 400.
- "Membro de outro casal vê, edita, conclui, planeja ou exclui desejo deste casal": 404 `WISH_NOT_FOUND`.

- [ ] **Step 2: Rodar e ver falhar** (404 nas rotas).

- [ ] **Step 3: Implementar shared, entidade, migration, repositório, serviço e controller**

Busque o `og:image` em `create`, e em `update` só quando `url` mudar. `url: null` limpa `imageUrl`. O `plan` grava o evento pelo `AgendaEventsRepository`, com `coupleId` do membro e `wishId`.

- [ ] **Step 4: Rodar `desejos.int-spec.ts` e `agenda.int-spec.ts`**

Expected: PASS. A Agenda continua com os 17 testes verdes, agora com `wishId: null` nos eventos comuns.

- [ ] **Step 5: Commit** `feat(api): wishes with planning into agenda`

### Task 3: Presentes na API, com reserva oculta para o dono

**Files:**

- Create: `packages/shared/src/gifts/{constants,schemas,index}.ts`
- Create: `apps/api/src/modules/gifts/{gift.entity,gifts.repository,gifts.service,gifts.controller,gifts.module,gift.mapper}.ts`
- Migration: `pnpm db:generate create_gifts`
- Test: `apps/api/test/presentes.int-spec.ts`

**Interfaces:**

- Consumes: `OgImageService.findImageUrl`; `CoupleRepository.findMember(coupleId, memberId)` para validar o `:memberId` da rota (membro inexistente ou de outro casal → 404 `GIFT_NOT_FOUND`).
- Produces:
  - Tabela `gifts`: `coreColumns`, `couple_id`, `owner_member_id`, `title`, `category gift_category`, `url`, `image_url`, `price_cents`, `notes`, `reserved_by_member_id` (nulo, FK `couple_members` com `set null`), `reserved_at`, `received_at`.
  - `GiftForOwner = { id, ownerMemberId, title, category, url, imageUrl, priceCents, notes, receivedAt, createdAt }`, sem campos de reserva.
  - `GiftForPartner = GiftForOwner & { reservedByMemberId: string | null, reservedAt: string | null }`.
  - Rotas sob `/api/members/:memberId/gifts`:
    - `GET`, com `?status=wanted|received`;
    - `POST`, `PATCH /:giftId`, `DELETE /:giftId`, `POST /:giftId/received`: só o dono;
    - `POST /:giftId/reservation` e `DELETE /:giftId/reservation`: só quem não é o dono, e a remoção só por quem reservou.
  - O mapper `toGiftResponse(row, viewerMemberId)` decide a forma: dono vê `GiftForOwner`, não dono vê `GiftForPartner`. Os controllers sempre passam por ele.
  - Erros:
    - `GIFT_NOT_FOUND` (404);
    - `GIFT_SELF_RESERVATION` (422);
    - `GIFT_NOT_OWNER` (403, dentro do mesmo casal, porque a parceira já vê a lista);
    - `GIFT_ALREADY_RESERVED` (409).

- [ ] **Step 1: Escrever os casos de uso em `presentes.int-spec.ts`**

- "Ela reserva um presente do Bruno; Bruno lista os presentes dele": o item vem sem `reservedByMemberId` e sem `reservedAt` (`expect(item).not.toHaveProperty('reservedByMemberId')`), também na resposta do `PATCH` e do `POST /received` feitos pelo Bruno.
- "Ela lista os presentes do Bruno": vê `reservedByMemberId` = id dela.
- "Bruno tenta reservar um presente da própria lista": 422 `GIFT_SELF_RESERVATION`.
- "Ela tenta reservar um presente já reservado": 409.
- "Ela tenta editar ou apagar um presente do Bruno": 403 `GIFT_NOT_OWNER`.
- "Bruno marca como recebido": sai de `wanted` e aparece em `received`.
- "Presente com URL de IP interno": `imageUrl: null`, sem requisição. Em seguida, o dono informa o `imageUrl` manualmente e ele é gravado.
- "Membro de outro casal lista, reserva ou edita presente deste casal": 404.
- "Feed ICS não inclui presentes": com o feed gerado, o título do presente não aparece no `.ics`.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** shared, entidade, migration, repositório, serviço, controller e mapper.

- [ ] **Step 4: Rodar `presentes.int-spec.ts`.** Expected: PASS.

- [ ] **Step 5: Commit** `feat(api): gifts with hidden reservations`

### Task 4: Tela de Desejos, com abas e "Planejar"

**Files:**

- Modify: `apps/web/src/app/app/wishes/page.tsx`, trocando `SectionPlaceholder` por `WishesScreen`
- Create: `apps/web/src/features/wishes/{hooks/use-wishes.ts, schemas/forms.ts, lib/wish-format.ts, components/wishes-screen.client.tsx, components/wish-card.tsx, components/wish-sheet.client.tsx, components/plan-wish-sheet.client.tsx}`
- Create: `apps/web/src/lib/money.ts` com `formatCents(cents: number): string` e `parseReaisToCents(text: string): number | null`
- Modify: `apps/web/src/features/agenda/hooks/use-agenda.ts`. Exporte `AGENDA_QUERY_KEY`, que já existe, e use-o no `onSuccess` do "Planejar".

**Interfaces:**

- Consumes: rotas da Task 2; `HealthSheet` (`@/features/health/components/health-sheet.client`).
- Produces:
  - `useWishes(filters: { status: 'open' | 'done' })`, com query key `['wishes', status]`; as mutações invalidam `['wishes']` e, no "Planejar", também `AGENDA_QUERY_KEY`.
  - `WishesScreen` com abas internas "Desejos" e "Presentes", na URL como `?aba=presentes` (ADR 0003, 6.4), e filtro de categoria em `?categoria=<WishCategory>`.
  - `WISH_CATEGORY_LABELS: Record<WishCategory, string>`: Filme, Música, Viagem, Fazer a dois, Ideia de rolê, Outro.
  - `formatCents(12990)` → `'R$ 129,90'`, com o espaço não separável que o `Intl` produz.

- [ ] **Step 1:** Implementar `money.ts`, os hooks e a tela:
  - filtro por categoria com o `FilterChip` de tarefas;
  - card com imagem (`<img referrerPolicy="no-referrer" loading="lazy">`) ou ícone da categoria;
  - preço e "Planejado para 20 de dezembro";
  - sheets de criar, editar e planejar. O de editar tem o campo "Link da imagem", com a dica "Use quando a imagem não aparecer sozinha", e o mesmo campo existe no sheet de presente (Task 5);
  - "Feitos" em lista separada.
- [ ] **Step 2:** Estender o teste e2e do admin ("admin cria lista…"): cria o desejo "Piquenique" (Ideia de rolê), planeja para hoje às 19:00 e confere "19:00 · Piquenique" na Agenda, com `expectNoHorizontalScroll`.
- [ ] **Step 3:** Rodar `pnpm --filter @vibru/web typecheck`, `pnpm lint`, zerar o throttle e rodar `pnpm e2e`. Expected: `4 passed`.
- [ ] **Step 4: Commit** `feat(web): wishes tab with planning`

### Task 5: Aba Presentes

**Files:**

- Create: `apps/web/src/features/gifts/{hooks/use-gifts.ts, schemas/forms.ts, components/gifts-tab.client.tsx, components/gift-card.tsx, components/gift-sheet.client.tsx}`
- Modify: `apps/web/src/features/wishes/components/wishes-screen.client.tsx`, renderizando `GiftsTab` em `?aba=presentes`

**Interfaces:**

- Consumes: rotas da Task 3; `useCouple()` para os dois membros e suas cores; `formatCents`.
- Produces:
  - `GiftsTab` com seletor de pessoa: "Meus" e o nome da parceira, na cor de cada membro, de `couple_members.color`.
  - Na lista própria, criar, editar e marcar recebido, sem nenhum indício de reserva.
  - Na lista da parceira, "Reservar" e "Desfazer reserva", esta só para quem reservou; item reservado por ela mostra "Você reservou".
  - "Recebidos" em lista separada.

- [ ] **Step 1:** Implementar hooks, aba, card e sheet. O front não decide a ocultação: ele só lê os campos que a API manda.
- [ ] **Step 2:** Conferência visual em 390px e `lg`, claro e escuro.
- [ ] **Step 3:** Gate completo, igual à Task 1 do plano da F6.
- [ ] **Step 4: Commit** `feat(web): gifts tab with reservations`

### Task 6: PR e merge

- [ ] **Step 1:** Push, PR com "Decisões":
  - `GIFT_NOT_OWNER` como 403 dentro do casal;
  - 409 em reserva duplicada;
  - `plannedOn` calculado;
  - `og:image` por regex no `<head>`;
  - imagens externas com `no-referrer`.
- [ ] **Step 2:** CI verde e `gh pr merge --merge`.
