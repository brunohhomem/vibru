# Lote D — saúde e medicações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Portar `health` (ficha, alergias, condições, contatos, médicos, histórico) e `medications` (remédios, tarefas diárias sincronizadas, estoque e Farmácia) para server actions, e ligar o estoque às tarefas que o lote C deixou prontas.

**Architecture:** Igual aos lotes anteriores. Os 5 tipos de item da ficha têm o mesmo contrato, então uma fábrica (`defineHealthItemActions`) gera criar/editar/excluir a partir de uma configuração (schemas, repositório, mapper). Regras de remédio (horários, reposição, plano de sincronização das tarefas, aviso de estoque baixo) são funções puras com spec; a action só lê, chama a regra e grava na mesma transação.

**Tech Stack:** Next 16, Drizzle/Neon, zod 4, TanStack Query 5, Vitest.

**Spec:** `docs/specs/N2-dominios.md` (lote D), `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md`. Referência de comportamento: `legacy/api/src/modules/{health,medications}`, `legacy/api/src/modules/tasks/medication-tasks.service.ts`, `legacy/shared/src/health`, `legacy/shared/src/tasks/medication-progress.ts`.

## Global Constraints

- Toda action passa por `defineMemberAction`; todo método de repositório recebe `coupleId` (e `memberId` nos itens da ficha). Mensagens de erro nunca repetem dado de saúde.
- Sem banco de teste: lógica pura com spec; verificação = testes, lint, typecheck, build e passada manual.
- Zod de domínio sai de `legacy/shared` para `src/features/health`; sem `eslint-disable`; mensagens em português iguais às do legado.
- Ficha: os dois membros leem e editam as duas fichas; membro de outro casal ou id malformado respondem igual ("Pessoa não encontrada").

## Rulings (decididos ao planejar)

- **Módulos copiados, não movidos** (como no lote C): schemas, constantes, `medication-stock` e `medication-progress` são copiados de `legacy/shared` para `src/features/health`; o frontend passa a importar de lá. As cópias do legado morrem no lote F.
- **FK de `tasks.medication_id`** é adicionada na migration deste lote (`ON DELETE SET NULL`, como no legado).
- **Estoque entra nas actions do lote C** nos pontos marcados "Lote D" em `src/features/tasks/actions.ts`: concluir desconta a dose e devolve o aviso de estoque baixo (uma vez por reposição); reabrir devolve a dose. Ambos na mesma transação da conclusão.
- **Fábrica de ações da ficha** em vez de 5 cópias de service/controller: cada tipo passa um `HealthItemConfig`. O vínculo `doctorId` do evento é validado contra médicos do mesmo membro (hook `beforeWrite` da configuração).
- **`'use server'` só exporta funções assíncronas**: `actions.ts` cria os conjuntos com a fábrica (módulo sem `'use server'`) e reexporta cada ação nomeada.
- **Farmácia** usa `addItemToNamedList(coupleId, 'Farmácia', nome)` do lote C.

## Review Focus

- Membro de outro casal ou id malformado em qualquer ação da ficha: "Pessoa não encontrada", sem tocar no banco de outro casal; item de outro membro: "Item não encontrado".
- Criar/editar remédio deixa exatamente uma tarefa diária aberta por horário (cria as que faltam, remove as que sobraram e duplicadas, atualiza título e responsável das demais); excluir remédio remove só as abertas.
- Estoque nunca fica negativo; concluir tarefa de remédio sem estoque controlado não desconta; o aviso de estoque baixo aparece uma única vez até repor; repor (valor maior que o atual) libera o próximo aviso.
- Reabrir tarefa de remédio devolve a dose; concluir duas vezes não desconta duas.
- Salvar o perfil de saúde substitui a ficha inteira (campo ausente vira vazio) e texto vazio vira nulo.

---

### Task 1: Copiar schemas e helpers de saúde para a feature

**Files:**

- Create: `src/features/health/{health-constants,health-schemas,medication-stock,medication-progress}.ts` e specs `medication-stock.spec.ts`, `medication-progress.spec.ts`
- Modify: imports de `@vibru/shared` em `src/features/{health,home,tasks,lists}` e onde mais usarem nomes dessas fichas
- Source: `legacy/shared/src/health/*`, `legacy/shared/src/tasks/medication-progress.ts` (+ specs)

**Interfaces:**

- Produces: os mesmos nomes do legado (`BLOOD_TYPES`, `ALLERGY_SEVERITIES`, `HEALTH_EVENT_KINDS`, `MAX_MEDICATION_TIMES`, `DEFAULT_LOW_STOCK_DAYS`, todos os schemas e tipos de request/response de saúde, `PharmacyResult`, `daysOfMedicationLeft`, `medicationProgressToday`), agora de `@/features/health/*`. `z` vem de `'zod'`; calendário, `phoneSchema` e `taskDueTimeSchema` vêm de `@vibru/shared` e `@/features/tasks/task-schemas`.

- [ ] **Step 1:** Copiar, ajustando imports. Estender o script `migrate-imports.mjs` com os novos módulos e rodá-lo sobre `src/features`.
- [ ] **Step 2:** `pnpm vitest run src/features/health` — Expected: specs copiados passam. `pnpm typecheck && pnpm lint` limpos.
- [ ] **Step 3:** Commit `refactor(health): domain schemas and helpers into the feature`.

### Task 2: Tabelas de saúde e remédios

**Files:**

- Create: `src/db/health-schema.ts` (perfil + 5 itens + enums), `src/db/medications-schema.ts`; export em `src/db/schema.ts`; migration `0006_health_medications` (inclui a FK de `tasks.medication_id`)
- Modify: `src/db/tasks-schema.ts` (`medicationId` passa a referenciar `medications.id`, `onDelete: 'set null'`)
- Source: entidades em `legacy/api/src/modules/{health,medications}`

**Interfaces:**

- Produces: `healthProfiles`, `allergies`, `healthConditions`, `emergencyContacts`, `doctors`, `healthEvents`, `medications`, enums `blood_type`, `allergy_severity`, `health_event_kind`, tipos `*Row`/`New*Row`. Índices e `check` do legado preservados; `health_profiles.member_id` único.

- [ ] **Step 1:** Portar as tabelas para a sintaxe de array de índices; `medications` antes de `tasks` no import para a FK (referência por função, sem ciclo de arquivo: `medications-schema` importa só de `couple-schema`).
- [ ] **Step 2:** `pnpm db:generate health_medications`, conferir o SQL (tabelas, enums, checks, FK nova) e `pnpm db:migrate`.
- [ ] **Step 3:** typecheck, lint; commit `feat(db): health and medications tables`.

### Task 3: Regras puras e mapeadores

**Files:**

- Create: `src/features/health/health-mappers.ts` (+ spec), `src/features/health/medication-rules.ts` (+ spec)

**Interfaces:**

- Produces:
  - `emptyProfile()`, `toHealthProfile`, `toAllergy`, `toHealthCondition`, `toEmergencyContact`, `toDoctor`, `toHealthEvent`, `toMedication` (nunca expõe `lowStockPromptedAt`), `emptyToNull(value)`.
  - `sortTimes(times: string[]): string[]`; `medicationTaskTitle(m: { name: string; dosage: string }): string` (`"Tomar {nome} {dose}"` aparado); `isRestock(existingStock: number | null, patchStock: number | null | undefined): boolean`; `buildMedicationUpdatePatch(existing, patch): Partial<NewMedicationRow>` (ordena horários e zera `lowStockPromptedAt` na reposição).
  - `planMedicationTaskSync(openTasks: Array<{ id: string; dueTime: string | null; title: string; assigneeMemberId: string | null }>, spec: { times: string[]; title: string; memberId: string }): { staleIds: string[]; updates: Array<{ id: string; title: string; assigneeMemberId: string }>; timesToCreate: string[] }` — fica uma tarefa aberta por horário.
  - `buildLowStockWarning(medication: { id: string; name: string; stockUnits: number | null; unitsPerDose: number; times: string[]; lowStockDays: number }): TaskLowStock | null` — nulo se o estoque não é controlado, sem horário, ou `daysLeft > lowStockDays`.

- [ ] **Step 1 (RED):** specs: mapeadores (datas ISO, nulos, `emptyProfile`); `sortTimes`; `medicationTaskTitle` ("Tomar Dipirona 500mg", dose vazia sem espaço sobrando); `isRestock` (maior que o atual, atual nulo → verdadeiro, igual/menor/nulo/indefinido → falso); `planMedicationTaskSync` (cria as que faltam; remove as de horário que não existe mais; remove duplicadas do mesmo horário; remove aberta sem horário; atualiza título/responsável só quando diferentes); `buildLowStockWarning` (limiar exato, sem estoque, sem horário, acima do limiar).
- [ ] **Step 2:** Implementar o mínimo; PASS; commit `feat(health): pure medication rules and mappers`.

### Task 4: Repositórios

**Files:**

- Create: `src/features/health/medications-repository.ts`, `src/features/health/health-profile-repository.ts`, `src/features/health/health-item-repositories.ts`

**Interfaces:**

- Produces:
  - `medications-repository`: `listMedicationsByMember`, `countMedicationsByMember`, `findActiveMedication(coupleId, id, executor?)`, `insertMedication`, `updateMedication`, `softDeleteMedication`, `decrementStock` (não passa de zero, só com estoque controlado), `incrementStock`, `markLowStockPrompted` (`WHERE low_stock_prompted_at IS NULL`).
  - tarefas de remédio (em `src/features/tasks/tasks-repository.ts`): `listOpenTasksByMedication(coupleId, medicationId, executor)`, `softDeleteTasks(coupleId, ids, executor)`.
  - `health-profile-repository`: `findProfile(coupleId, memberId)`, `upsertProfile(row)`.
  - `health-item-repositories`: para cada tipo, um objeto com a interface `HealthItemRepository<Row, NewRow>`: `listByMember`, `findActive(coupleId, memberId, itemId)`, `insert`, `update`, `softDelete` (boolean). Ordenação do legado (alergias por gravidade, eventos por data desc).

- [ ] **Step 1:** Portar as consultas de `legacy/api/src/modules/{health,medications}/*.repository.ts`, trocando classes por funções e `tx` por `DatabaseExecutor`.
- [ ] **Step 2:** typecheck, lint; commit `feat(health): repositories`.

### Task 5: Ações da ficha

**Files:**

- Create: `src/features/health/define-health-item-actions.ts`, `src/features/health/health-member-access.ts` (+ spec), `src/features/health/actions.ts` (+ `actions.spec.ts`)

**Interfaces:**

- Produces: `requireCoupleMember(coupleId, memberId): Promise<CoupleMemberRow>` (id malformado ou de outro casal → `ActionFailure('failed','Pessoa não encontrada')`, mesma mensagem nos dois); `defineHealthItemActions<Row, New, Item>(config)` com `create({ memberId, data })`, `update({ memberId, itemId, data })`, `remove({ memberId, itemId })`; actions `listHealthMembersAction`, `getHealthRecordAction({ memberId })`, `saveHealthProfileAction({ memberId, data })` e os 15 `create|update|remove{Allergy,Condition,Contact,Doctor,Event}Action`.

- [ ] **Step 1 (RED):** `actions.spec.ts` com repositórios simulados: membro de outro casal e id inválido dão a mesma falha e nada é gravado; item de outro membro → "Item não encontrado"; `update` de evento com `doctorId` de outro membro → "Item não encontrado"; `saveHealthProfileAction` com campos ausentes grava nulos e texto vazio vira nulo; toda busca recebe o `coupleId` do membro.
- [ ] **Step 2:** Implementar fábrica, acesso ao membro e actions; PASS.
- [ ] **Step 3:** lint, typecheck; commit `feat(health): health record actions`.

### Task 6: Remédios, Farmácia e estoque nas tarefas

**Files:**

- Create: `src/features/health/medication-actions.ts` (+ `medication-actions.spec.ts`), `src/features/health/medication-stock-actions.ts` (função de servidor `consumeDose`/`returnDose`, sem `'use server'`)
- Modify: `src/features/tasks/actions.ts` (concluir e reabrir chamam o estoque), `src/features/tasks/actions.spec.ts`

**Interfaces:**

- Produces: `createMedicationAction({ memberId, data })`, `updateMedicationAction({ id, data })`, `removeMedicationAction({ id })`, `addMedicationToPharmacyAction({ id })`; `consumeDose(coupleId, medicationId, executor): Promise<TaskLowStock | null>`, `returnDose(coupleId, medicationId, executor): Promise<void>`.

- [ ] **Step 1 (RED):** specs: criar remédio grava e sincroniza na mesma transação (mock de `transaction`), horários ordenados; editar com reposição zera o aviso; remover só apaga abertas; id de outro casal → "Remédio não encontrado"; Farmácia chama `addItemToNamedList(coupleId, 'Farmácia', nome)`; `consumeDose`: estoque não controlado → nulo, abaixo do limiar e aviso ainda não dado → aviso, aviso já dado → nulo; em `tasks/actions.spec.ts`: concluir tarefa de remédio chama `consumeDose` e devolve `lowStock`, reabrir chama `returnDose`, tarefa comum não chama nenhum.
- [ ] **Step 2:** Implementar; PASS. Remover os comentários "Lote D" de `tasks/actions.ts`.
- [ ] **Step 3:** lint, typecheck, test, build; commit `feat(health): medication actions and stock`.

### Task 7: Hooks e telas

**Files:**

- Modify: `src/features/health/hooks/use-health.ts`, telas e sheets de `src/features/health/components` que dependiam de `api`

**Interfaces:**

- Produces: mesmos hooks e chaves de cache (`useHealthMembers`, `useHealthRecord`, `useUpdateHealthProfile`, `useCreate|Update|DeleteHealthItem(kind)`, `useCreate|Update|DeleteMedication`, `useAddToPharmacy`) sobre as actions, mapeando `HealthItemKind` para as actions certas.

- [ ] **Step 1:** Reescrever `use-health.ts` com `unwrapActionResult`; tabela `kind → { create, update, remove }`.
- [ ] **Step 2:** `rg "lib/api'" src/features/health` — Expected: sem ocorrências. lint, typecheck, test, build; commit `feat(health): health hooks and screens on server actions`.

### Task 8: Fechamento

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- [ ] **Step 2:** Passada manual pendente do usuário (ficha, itens, remédio com horários, concluir tarefa de remédio e ver o estoque, aviso de estoque baixo e Farmácia).
- [ ] **Step 3:** Revisão final com subagente Opus, correção em uma passada, PR e CI.
