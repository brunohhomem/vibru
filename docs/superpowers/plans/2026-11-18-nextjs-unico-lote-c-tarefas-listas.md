# Lote C — tarefas e listas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Portar `tasks` e `lists` do `legacy/api` para server actions, com regras de negócio em funções puras testadas, e religar as telas de tarefas e listas (e o que da home depende delas) sem o axios.

**Architecture:** Igual aos lotes A e B: `defineMemberAction` fino sobre repositório Drizzle e funções puras. Schemas zod e helpers de domínio de tarefas e listas saem de `legacy/shared` para `src/features/{tasks,lists}`; o calendário (`todayInSaoPaulo`, `addCalendarDays`, `startOfWeek`, `CalendarDate`) continua vindo de `@vibru/shared` até o lote F.

**Tech Stack:** Next 16, Drizzle/Neon, zod 4, TanStack Query 5, Vitest.

**Spec:** `docs/specs/N2-dominios.md` (lote C), `docs/superpowers/specs/2026-11-18-nextjs-unico-design.md`. Referência de comportamento: `legacy/api/src/modules/{tasks,lists}`, `legacy/shared/src/{tasks,lists}`.

## Global Constraints

- Toda action passa por `defineMemberAction`; todo método de repositório recebe `coupleId`.
- Sem banco de teste: lógica em funções puras com spec; verificação = testes, lint, typecheck, build e passada manual.
- Zod de domínio fora de `legacy/shared`; sem `eslint-disable`; mensagens ao usuário em português, iguais às do legado.
- Datas de calendário são `YYYY-MM-DD` (string), nunca `Date`; "hoje" é o de São Paulo.

## Rulings (decididos ao planejar)

- **`tasks.medication_id` nasce como `uuid` sem FK.** A tabela `medications` é do lote D, que adiciona a FK na sua migration. Até lá nenhuma tarefa de remédio existe.
- **Consumo e devolução de estoque ficam para o lote D.** `complete`/`reopen` do legado chamam `MedicationStockService`; aqui a transação de concluir e reabrir não tem esse passo, e o plano do lote D o encaixa (ponto único: `completeTaskAction` e `reopenTaskAction`). A trava "tarefa de remédio só muda pelo remédio" é pura e entra agora.
- **Módulos copiados, não movidos.** `legacy/shared` ainda é importado por `legacy/api` e por código dos lotes D/E; os arquivos de tarefas e listas são copiados para as features e o frontend passa a importar das features. As cópias do legado morrem no lote F.
- **`NamedListService` entra agora** como função (`addItemToNamedList`) porque a farmácia do lote D a usa; sem action.
- **Erro de not-found:** id que não é UUID ou de outro casal vira `ActionFailure('failed', 'Tarefa não encontrada')` / `'Lista não encontrada'` / `'Item não encontrado'`.

## Review Focus

- Concluir duas vezes a mesma tarefa: a segunda falha com "Tarefa já concluída" e não cria uma segunda ocorrência.
- Concluir tarefa recorrente cria a próxima a partir do prazo atual ou de hoje (o que for maior), ancorada no primeiro prazo; reabrir remove o filho gerado só se ninguém mexeu nele.
- Responsável de outro casal ou inexistente é recusado em `assigneeMemberId`; tarefa de outro casal nunca é lida nem alterada.
- Horário sem prazo e recorrência sem prazo são recusados na criação e na edição; limpar o prazo limpa o horário.
- Marcar item já marcado (e desmarcar item aberto) é idempotente e devolve o estado atual; limpar marcados em lista sem marcados não falha.

---

### Task 1: Copiar schemas e helpers de domínio para as features

**Files:**

- Create: `src/features/tasks/{categories,recurrence,grouping,schemas}.ts` e specs `recurrence.spec.ts`, `grouping.spec.ts`; `src/features/lists/schemas.ts`
- Modify: imports de `@vibru/shared` nos arquivos de `src/features/{tasks,lists}` e em `src/features/home` que usam tipos/helpers de tarefas e listas
- Source: `legacy/shared/src/tasks/{categories,recurrence,grouping,schemas}.ts` (+ specs), `legacy/shared/src/lists/schemas.ts`

**Interfaces:**

- Produces: mesmos nomes exportados do legado (`TASK_CATEGORIES`, `TASK_CATEGORY_LABELS`, `TASK_RECURRENCE_KINDS`, `nextRecurrence`, `groupTasks`, `createTaskRequestSchema`, `updateTaskRequestSchema`, `Task`, `TasksResponse`, `CompleteTaskResponse`, `TaskLowStock`, `List`, `ListItem`, `ListsResponse`, `listTitleSchema`, `listItemTitleSchema`, schemas de request de lista), agora de `@/features/tasks/*` e `@/features/lists/schemas`. `z` vem de `'zod'`; calendário continua de `@vibru/shared`.

- [ ] **Step 1:** Copiar os arquivos, trocando `'../zod'` por `'zod'`, `calendarDateSchema` e `CalendarDate` por import de `@vibru/shared`. `medication-progress` não vem (lote D).
- [ ] **Step 2:** Rodar `pnpm vitest run src/features/tasks` — Expected: os specs de recorrência e agrupamento passam como no legado.
- [ ] **Step 3:** Trocar os imports do frontend de tarefas, listas e home para as features; `pnpm typecheck` — Expected: sem erro.
- [ ] **Step 4:** lint; commit `refactor(tasks,lists): domain schemas and helpers into the features`.

### Task 2: Tabelas `tasks`, `lists` e `list_items`

**Files:**

- Create: `src/db/tasks-schema.ts`, `src/db/lists-schema.ts` (exportados em `src/db/schema.ts`), migration `0005_tasks_lists`
- Source: `legacy/api/src/modules/{tasks/task.entity.ts,lists/list.entity.ts,lists/list-item.entity.ts}`

**Interfaces:**

- Produces: `tasks`, `taskRecurrenceEnum`, `taskCategoryEnum`, `lists`, `listItems`, e tipos `TaskRow`, `NewTaskRow`, `ListRow`, `ListItemRow`. `couple_id`, `assignee_member_id`, `completed_by_member_id`, `checked_by_member_id` são `uuid` com FK para `couples`/`couple_members` como no legado; `medication_id` é `uuid` sem FK (ruling). Mantém os `check` de horário e recorrência e todos os índices.

- [ ] **Step 1:** Portar as tabelas para a sintaxe de array de índices usada em `couple-schema.ts`.
- [ ] **Step 2:** `pnpm db:generate tasks_lists`, conferir o SQL e `pnpm db:migrate`.
- [ ] **Step 3:** typecheck, lint; commit `feat(db): tasks and lists tables`.

### Task 3: Regras puras de tarefa

**Files:**

- Create: `src/features/tasks/task-rules.ts`, `src/features/tasks/task-rules.spec.ts`

**Interfaces:**

- Produces:
  - `findTaskInputIssue(input: { dueOn: string | null; dueTime: string | null; recurrenceKind: TaskRecurrence }): { field: 'dueOn' | 'dueTime'; message: string } | null` — recorrência sem prazo (`'Tarefa recorrente precisa de prazo'`, campo `dueOn`) e horário sem prazo (`'Informe o prazo antes do horário'`, campo `dueTime`).
  - `changesMedicationLockedFields(patch: UpdateTaskRequest): boolean` (title, assignee, category, dueTime, dueOn, recurrence).
  - `resolveDueTime(existingDueTime: string | null, patchDueTime: string | null | undefined, dueOn: string | null): string | null` — limpar o prazo limpa o horário.
  - `resolveRecurrenceAnchor(existing: { kind: TaskRecurrence; anchorOn: string | null }, patch: { dueOn?: string | null }, recurrenceKind: TaskRecurrence, dueOn: string | null): string | null`.
  - `buildNextOccurrence(completed: TaskRow, today: string): NewTaskRow | null` — `null` se não recorrente; lança se sem âncora ou prazo; prazo = `nextRecurrence(anchor, kind, interval, max(dueOn, today))`; copia título, notas, responsável, horário, categoria, medicação e recorrência, com `generatedFromTaskId`.
  - `isUntouchedChild(task: Pick<TaskRow, 'createdAt' | 'updatedAt'>): boolean`.
  - `toTask(row: TaskRow): Task` (horário em `HH:MM`, datas em ISO).

- [ ] **Step 1 (RED):** specs: todas as combinações de `findTaskInputIssue`; `changesMedicationLockedFields` (só `notes` é livre); `resolveDueTime` limpa horário ao limpar prazo e mantém quando prazo não muda; `resolveRecurrenceAnchor` (volta a `none` → `null`, muda prazo → novo prazo, sem mudança → âncora antiga); `buildNextOccurrence` mensal com prazo no passado usa hoje como base, prazo no futuro usa o prazo, não recorrente → `null`, sem âncora → lança; `isUntouchedChild`; `toTask` corta segundos do horário.
- [ ] **Step 2:** Implementar o mínimo; rodar — PASS. Commit `feat(tasks): pure task rules`.

### Task 4: Repositório, actions e hooks de tarefas

**Files:**

- Create: `src/features/tasks/tasks-repository.ts`, `src/features/tasks/actions.ts`
- Modify: `src/features/tasks/hooks/use-tasks.ts` e as telas de `src/features/tasks/components` que usam o hook

**Interfaces:**

- Consumes: `defineMemberAction`, `ActionFailure`, `findCoupleMembers`, funções da Task 3, `todayInSaoPaulo`, `startOfWeek`, `addCalendarDays`.
- Produces: `listTasksAction(undefined): TasksResponse`, `createTaskAction(CreateTaskRequest): Task`, `updateTaskAction({ id, patch }): Task`, `completeTaskAction({ id }): CompleteTaskResponse` (com `lowStock: null` até o lote D), `reopenTaskAction({ id }): Task`, `removeTaskAction({ id }): null`. Repositório espelha `tasks.repository.ts` (listOpen, listCompletedBetweenDates com `AT TIME ZONE 'America/Sao_Paulo'`, create, update, completeIfOpen, clearCompletion, findGeneratedChild, hardDelete, softDelete), sempre com `coupleId`.

- [ ] **Step 1:** Repositório portado; concluir roda em `getDatabase().transaction` com `completeIfOpen` (sem linha → `ActionFailure('failed','Tarefa já concluída')`) e, se recorrente, cria `buildNextOccurrence` na mesma transação; reabrir limpa a conclusão e apaga o filho só se `isUntouchedChild`.
- [ ] **Step 2:** Actions finas sobre as regras puras; responsável validado contra `findCoupleMembers(member.coupleId)` (`ActionFailure('invalid_input','Responsável não é membro deste casal','assigneeMemberId')`); tarefa de remédio recusa campos travados e exclusão (`'Tarefa de remédio só muda pelo remédio'`).
- [ ] **Step 3:** `use-tasks.ts` troca `api` por actions + `unwrapActionResult`, mantendo o update otimista de concluir e as chaves de cache; telas ajustadas só onde importavam axios ou erro HTTP.
- [ ] **Step 4:** lint, typecheck, `pnpm test`, build; commit `feat(tasks): task actions and screens`.

### Task 5: Listas (regras, repositório, actions, hooks)

**Files:**

- Create: `src/features/lists/list-mappers.ts` (+ spec), `src/features/lists/lists-repository.ts`, `src/features/lists/actions.ts`
- Modify: `src/features/lists/hooks/use-lists.ts` e telas de `src/features/lists/components`

**Interfaces:**

- Produces: `toListItem(row): ListItem`, `toList(row, items): List`, `toListSummary(row): ListSummary` (puras, ISO nas datas); actions `listListsAction`, `createListAction({ title })`, `getListAction({ id })`, `renameListAction({ id, title })`, `removeListAction({ id })`, `addListItemAction({ listId, title })`, `editListItemAction({ listId, itemId, title })`, `checkListItemAction`, `uncheckListItemAction`, `removeListItemAction`, `clearCheckedItemsAction({ listId })`. Repositório espelha `lists.repository.ts` (resumos com contagem via `count(...) filter`, itens ordenados abertos por criação e marcados por marcação mais recente, `checkIfOpen`/`uncheckIfChecked` condicionais, `touch`).

- [ ] **Step 1 (RED):** spec de `toListItem`/`toList`/`toListSummary` (datas ISO, `checkedAt` nulo). Implementar; PASS.
- [ ] **Step 2:** Repositório e actions; check/uncheck em transação com `touch`, devolvendo o estado atual quando nada muda (idempotência); item e lista conferidos por `coupleId` e UUID válido.
- [ ] **Step 3:** `use-lists.ts` sobre as actions, mantendo as chaves de cache e o toggle otimista.
- [ ] **Step 4:** lint, typecheck, test, build; commit `feat(lists): list actions and screens`.

### Task 6: Lista nomeada (para a farmácia do lote D)

**Files:**

- Create: `src/features/lists/named-list.ts`, `src/features/lists/named-list.spec.ts`

**Interfaces:**

- Produces: `normalizeListTitle(text: string): string` (NFD, sem diacríticos, trim, minúsculas); `pickExistingOpenItem(items: Array<{ id: string; title: string; checkedAt: Date | null }>, itemTitle: string): { id: string; title: string } | null` (pura); `addItemToNamedList(coupleId: string, listTitle: string, itemTitle: string): Promise<PharmacyResult>` (acha ou cria a lista pelo nome normalizado, não duplica item aberto igual).

- [ ] **Step 1 (RED):** specs de `normalizeListTitle` ("Farmácia" == " farmacia ") e `pickExistingOpenItem` (ignora marcados, casa sem acento e caixa).
- [ ] **Step 2:** Implementar as duas puras e a função assíncrona sobre o repositório; PASS; commit `feat(lists): named list helper`.

### Task 7: Fechamento

- [ ] **Step 1:** `rg "from '@/lib/api'" src/features/tasks src/features/lists` — Expected: sem ocorrências. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- [ ] **Step 2:** Passada manual (tarefas: criar, editar, concluir, reabrir, recorrente, excluir; listas: criar, itens, marcar, limpar marcados; home mostra os dados) — pendente do usuário, registrada na PR.
- [ ] **Step 3:** Revisão final com subagente Opus, correção em uma passada, PR e CI.
