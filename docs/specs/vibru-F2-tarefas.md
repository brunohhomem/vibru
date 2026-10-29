# Spec Vibru F2 — Tarefas

| Campo     | Valor                                                               |
| --------- | ------------------------------------------------------------------- |
| ADR       | `docs/adr/0003-vibru-v1.md` + `docs/adr/0002-template-enxuto-v1.md` |
| Depende   | F1 mergeada na `main` (feito)                                       |
| Executor  | Um agente só (Cursor ou Claude Code), do início ao fim              |
| Modo      | Autônomo: não peça confirmação. Pare só nas paradas da seção 0      |
| Branch/PR | `feat/vibru-f2-tarefas` → PR para `main`. Nunca faça merge          |

---

## 0. Regras de execução

**Preparação (antes de qualquer entrega).** A F1 já está mergeada no GitHub, mas o clone local ainda está na branch da F1 e esta spec ainda não foi commitada (aparece como não rastreada):

```bash
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git log --oneline -1          # deve mostrar o merge da F1
git checkout -b feat/vibru-f2-tarefas
git add docs/specs/vibru-F2-tarefas.md
git commit -m "docs: add vibru f2 spec"
git push -u origin feat/vibru-f2-tarefas
```

Se o `pull --ff-only` falhar ou o último commit da `main` não for o merge da F1, pare e informe (parada obrigatória). Não apague a branch local da F1 nem faça `reset`.

As regras 0.1 a 0.9 da spec da F1 (`docs/specs/vibru-F1-casal-e-base-visual.md`) valem sem mudança: leitura prévia, um commit por entrega, gate pré-push completo (inclusive `pnpm e2e`), testes só por caso de uso (exceto funções puras do `shared`), nenhuma dependência nova, nada de instalar programas, decisão não coberta registrada no PR, paradas obrigatórias e retomada pelo checklist do PR.

## 1. Objetivo

1. Corrigir dois problemas encontrados na revisão da F1 (seção 2).
2. Entregar o módulo de Tarefas: Bruno, ela ou "nós"; prazo; recorrência; conclusão com registro de quem fez; desfazer; atrasadas; feitas esta semana; observações.
3. Ligar a contagem de tarefas aos blocos dos membros na home.

## 2. Correções da F1 (primeiras entregas)

| #   | Problema                                                                                                                                                                                                                                                                                                                                 | Correção                                                                                                                                                                                                                                                                                                                                                                                                 | Caso de uso                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | **Throttlers nomeados valem em toda rota.** Uma rota sem `@SkipThrottle` conta no balde `login` (em GET sem corpo, a chave vira `throttle:login:<ip>:`, compartilhada). A F1 contornou isso copiando a lista de `@SkipThrottle` no `CoupleController`; `people` e `users` continuam expostos, e todo controller novo herdaria o problema | No `AppThrottlerGuard`, um throttler nomeado (todos menos `default`) só se aplica quando a rota ou o controller declara `@Throttle({ <nome>: … })`. Use o `Reflector` com as chaves de metadata do `@nestjs/throttler` instalado. Remova as listas de `@SkipThrottle` que existem só para esse contorno (`couple`, `settings` e outras com o mesmo fim; mantenha as que tiverem outro motivo, comentado) | "Membro abre o casal 30 vezes seguidas" → nenhum 429. "Força bruta numa conta" (catálogo do ADR 0002) continua dando 429 |
| 2.2 | **`PATCH /couple` não limpa data.** O schema aceita `null`, mas o service usa `??`, então `null` mantém o valor antigo                                                                                                                                                                                                                   | Combinar por presença do campo (`!== undefined`), não por `??`                                                                                                                                                                                                                                                                                                                                           | "Membro apaga a data do casamento" → `marriedOn: null`, `married: null`, `nextWeddingAnniversary: null`                  |

## 3. Decisões fechadas

| #    | Decisão                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | **Responsável:** `assigneeMemberId` de um membro do casal, ou `null` = "nós"                                                                                                                                                                                                                                                                                                         |
| 3.2  | **Recorrência ancorada:** a tarefa guarda `recurrenceAnchorOn` (o primeiro prazo). As ocorrências são `âncora + k × intervalo`. Ao concluir, a próxima recebe **a primeira ocorrência estritamente posterior a `max(hoje, prazo atual)`**. Exemplo: toda segunda, prazo 02/11, concluída na quarta 04/11 → próxima 09/11. Concluída adiantada, na sexta 30/10 → próxima também 09/11 |
| 3.3  | **Mensal e anual sem deriva:** o dia vem da âncora. Âncora no dia 31 cai no último dia dos meses mais curtos (30/11, 28/02) e volta a 31 em dezembro. 29/02 anual segue a regra do ADR 0003 (28/02)                                                                                                                                                                                  |
| 3.4  | Tarefa recorrente **exige prazo**. Mudar o prazo de uma tarefa recorrente redefine a âncora para o novo prazo                                                                                                                                                                                                                                                                        |
| 3.5  | **Conclusão** grava `completedAt` e `completedByMemberId`. Concluir uma tarefa recorrente cria a próxima **na mesma transação**, com o mesmo título, observações, responsável e regra, e `generatedFromTaskId` apontando para a concluída                                                                                                                                            |
| 3.6  | **Desfazer:** `POST /tasks/:id/reopen` limpa a conclusão. Se a tarefa gerou uma próxima que ainda não foi tocada (`updatedAt = createdAt` e não concluída), a próxima é apagada de fato (`DELETE`). Se já foi tocada, fica                                                                                                                                                           |
| 3.7  | **Exclusão** é lógica (`isActive = false`) e some de todas as listas                                                                                                                                                                                                                                                                                                                 |
| 3.8  | **Grupos** (função pura no `shared`, usada pelo web): Atrasadas (prazo < hoje) → Hoje → Esta semana (até domingo) → Mais pra frente → Sem prazo. Dentro do grupo: prazo asc, depois `createdAt` asc                                                                                                                                                                                  |
| 3.9  | **Semana** = segunda a domingo, no fuso de São Paulo. "Feitas esta semana" = concluídas com `completedAt` nesse intervalo                                                                                                                                                                                                                                                            |
| 3.10 | Concluídas de semanas anteriores ficam no banco e não aparecem no v1                                                                                                                                                                                                                                                                                                                 |
| 3.11 | **Contagem da home:** bloco de cada membro = tarefas abertas dele com prazo ≤ hoje (Hoje + Atrasadas). Tarefas "nós" não entram nos blocos dos membros                                                                                                                                                                                                                               |

## 4. Banco

Migration `create_tasks`. Enum `task_recurrence`: `'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'`.

**`tasks`** (`coreColumns`)

| Coluna                   | Tipo              | Regras                                          |
| ------------------------ | ----------------- | ----------------------------------------------- |
| `couple_id`              | uuid              | FK `couples.id` on delete cascade, not null     |
| `title`                  | text              | not null (1–200)                                |
| `notes`                  | text              | null (até 2000)                                 |
| `assignee_member_id`     | uuid              | FK `couple_members.id` on delete set null, null |
| `due_on`                 | date              | null                                            |
| `recurrence_kind`        | `task_recurrence` | not null, default `none`                        |
| `recurrence_interval`    | integer           | not null, default 1 (1–365)                     |
| `recurrence_anchor_on`   | date              | null                                            |
| `completed_at`           | timestamptz       | null                                            |
| `completed_by_member_id` | uuid              | FK `couple_members.id` on delete set null, null |
| `generated_from_task_id` | uuid              | FK `tasks.id` on delete set null, null, índice  |

Índices: (`couple_id`, `completed_at`), (`couple_id`, `due_on`). Check constraint: `recurrence_kind = 'none' OR (due_on IS NOT NULL AND recurrence_anchor_on IS NOT NULL)`. Datas em `mode: 'string'`.

## 5. Contratos (`packages/shared/src/tasks/`)

**Funções puras** (com teste unitário):

| Função                                                        | Regra                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `addRecurrence(anchor, kind, interval, steps): CalendarDate`  | `anchor + steps × interval` na unidade do `kind`, com o clamp de fim de mês da regra 3.3 |
| `nextRecurrence(anchor, kind, interval, after): CalendarDate` | Primeira ocorrência estritamente posterior a `after` (regra 3.2)                         |
| `startOfWeek(today): CalendarDate`                            | Segunda-feira da semana de `today`                                                       |
| `groupTasks(tasks, today)`                                    | `{ overdue, today, thisWeek, later, noDueDate }`, com a ordenação da regra 3.8           |

Testes mínimos: semanal com conclusão atrasada e adiantada (exemplos da regra 3.2); mensal com âncora 31 passando por novembro, fevereiro e dezembro; anual em 29/02; diário a cada 2 dias; domingo como fim de semana; tarefa com prazo hoje em `today`, ontem em `overdue`, domingo em `thisWeek`, segunda seguinte em `later`.

**Schemas**

| Export                    | Definição                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `taskRecurrenceSchema`    | enum da seção 4                                                                                                                                                                                  |
| `taskSchema`              | `{ id, title, notes, assigneeMemberId: uuid \| null, dueOn: date \| null, recurrence: { kind, interval }, completedAt: string \| null, completedByMemberId: uuid \| null, createdAt }`           |
| `tasksResponseSchema`     | `{ today: date, weekStartsOn: date, open: task[], completedThisWeek: task[] }`                                                                                                                   |
| `createTaskRequestSchema` | `{ title (trim, 1–200), notes? (até 2000), assigneeMemberId: uuid \| null, dueOn?: date \| null, recurrence?: { kind, interval (1–365) } }`; `kind ≠ none` exige `dueOn` (erro no campo `dueOn`) |
| `updateTaskRequestSchema` | Mesmos campos, todos opcionais, ao menos um                                                                                                                                                      |

**Códigos de erro** (`TASK_ERROR_CODES`):

| `code`                    | HTTP | Quando                                                                   |
| ------------------------- | ---- | ------------------------------------------------------------------------ |
| `TASK_NOT_FOUND`          | 404  | Id inexistente, excluída ou de outro casal                               |
| `TASK_ASSIGNEE_INVALID`   | 400  | `assigneeMemberId` não é membro deste casal (erro em `assigneeMemberId`) |
| `TASK_RECURRENCE_INVALID` | 400  | Recorrência sem prazo depois de combinar com o que está salvo (`dueOn`)  |
| `TASK_ALREADY_COMPLETED`  | 409  | Concluir uma tarefa já concluída                                         |
| `TASK_NOT_COMPLETED`      | 409  | Reabrir uma tarefa aberta                                                |

## 6. API (`apps/api/src/modules/tasks/`)

Controller com `@RequiresCouple()` + `CoupleMemberGuard` (padrão da F1). Sem `@SkipThrottle`: com a correção 2.1, ele não é mais necessário. O repositório recebe `coupleId` em todo método.

| Método e rota              | Corpo               | Sucesso                                       | Efeito                                     |
| -------------------------- | ------------------- | --------------------------------------------- | ------------------------------------------ |
| `GET /tasks`               | —                   | 200 `tasksResponse`                           | Abertas e ativas + concluídas desta semana |
| `POST /tasks`              | `createTaskRequest` | 201 `task`                                    | Âncora = prazo, quando recorrente          |
| `PATCH /tasks/:id`         | `updateTaskRequest` | 200 `task`                                    | Regras 3.4 e validação combinada           |
| `POST /tasks/:id/complete` | —                   | 200 `{ completed: task, next: task \| null }` | Regra 3.5                                  |
| `POST /tasks/:id/reopen`   | —                   | 200 `task`                                    | Regra 3.6                                  |
| `DELETE /tasks/:id`        | —                   | 204                                           | Regra 3.7                                  |

`:id` passa por validação de uuid; uuid malformado responde 404 `TASK_NOT_FOUND`, não 400.

## 7. Web

**`/app/tasks`** (substitui o estado vazio da F1)

| Parte              | Comportamento                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filtro             | Chips: Todas · {nome azul} · {nome roxo} · Nós. O filtro fica na URL (`?de=<memberId>` ou `?de=nos`), para o bloco da home abrir já filtrado. Filtrar é no cliente                                                                                                                                                        |
| Resumo             | Bloco no topo: "N abertas" e "N feitas esta semana"                                                                                                                                                                                                                                                                       |
| Grupos             | Regra 3.8, com o nome e a contagem de cada grupo. Grupo vazio não aparece. Atrasadas mostram o prazo em destaque                                                                                                                                                                                                          |
| Item               | Botão de concluir (círculo ≥ 44px de alvo, na cor forte do responsável; "nós" em `primary`), título, prazo relativo ("hoje", "amanhã", "sáb, 14 nov"), ícone de repetição quando recorrente, chip do responsável. Tocar no item abre a edição                                                                             |
| Concluir           | Otimista. Toast do `sonner` "Concluída" com ação "Desfazer" (chama `reopen`). Em tarefa "nós", o toast diz quem fez                                                                                                                                                                                                       |
| Feitas esta semana | Seção recolhida no fim; cada item mostra "feita por {nome}" e pode ser reaberto                                                                                                                                                                                                                                           |
| Criar e editar     | Botão flutuante "Nova tarefa" acima da barra de navegação. Abre um `Sheet` com: título; responsável (3 opções segmentadas); prazo (input `date` + atalhos Hoje e Amanhã); repetir (não repete, todo dia, toda semana, todo mês, todo ano + "a cada N"); observações. Na edição, botão Excluir com confirmação em `Dialog` |
| Estados            | Loading em skeleton, vazio ("Nenhuma tarefa aberta"), erro com retry                                                                                                                                                                                                                                                      |

**Home:** os blocos azul e roxo passam a mostrar "N tarefas hoje" (regra 3.11), com "nenhuma tarefa hoje" quando 0, e levam a `/app/tasks?de=<memberId>`. A query de tarefas é a mesma da tela (mesma `queryKey`), e qualquer mutação invalida as duas.

## 8. Casos de uso (aceite da API)

Arquivo `test/tarefas.int-spec.ts`. O helper `createCouple` da F1 já fornece os dois membros.

| Caso de uso                                                                  | Esperado                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Membro cria tarefa sem responsável                                           | Aparece como "nós" para os dois membros                                  |
| Membro cria tarefa para a parceira                                           | Ela vê a tarefa com `assigneeMemberId` dela                              |
| Membro atribui tarefa a um membro de outro casal                             | 400 `TASK_ASSIGNEE_INVALID`                                              |
| Membro de outro casal busca, edita, conclui ou exclui uma tarefa deste casal | 404 `TASK_NOT_FOUND` em todas                                            |
| Membro cria tarefa recorrente sem prazo                                      | 400, erro em `dueOn`                                                     |
| Membro conclui uma tarefa semanal atrasada                                   | `next` com o prazo da regra 3.2 e `completedByMemberId` de quem concluiu |
| Membro conclui uma tarefa semanal adiantada                                  | `next` com prazo depois do prazo atual                                   |
| Membro conclui uma tarefa mensal com âncora no dia 31 em novembro            | `next` em 31/12                                                          |
| Membro desfaz a conclusão de uma recorrente cuja próxima não foi tocada      | A tarefa volta a aberta e a próxima some da lista                        |
| Membro desfaz a conclusão depois de editar a próxima                         | A tarefa volta a aberta e a próxima continua                             |
| Membro conclui uma tarefa já concluída                                       | 409 `TASK_ALREADY_COMPLETED`                                             |
| Membro exclui uma tarefa                                                     | Some da lista dos dois                                                   |
| Tarefa concluída na semana passada                                           | Não aparece em `completedThisWeek`                                       |

Mais os casos da seção 2 (throttler e limpar data).

**E2E** (acrescentar ao smoke): a parceira faz login, cria uma tarefa para o Bruno com prazo hoje, vê o item em "Hoje", conclui, toca "Desfazer" e o item volta. O Bruno faz login e o bloco azul da home mostra "1 tarefa hoje". Em 390×844, sem scroll horizontal.

## 9. Entregas (ordem fixa, um commit cada)

0. `docs: add vibru f2 spec` (preparação, seção 0)
1. `fix(api): apply named throttlers only where declared` (2.1 + casos)
2. `fix(api): allow clearing couple dates` (2.2 + caso)
3. `feat(shared): task recurrence and grouping helpers` (seção 5, funções + testes)
4. `feat(api): tasks module` (seções 4, 5 schemas, 6, casos de uso)
5. `feat(web): tasks screen` (seção 7)
6. `feat(web): task counts on home` (seção 7, home)
7. `test(e2e): tasks flow` (seção 8, E2E)

## 10. Fora de escopo

Placar ou estatística além de "feitas esta semana" · histórico de semanas anteriores · tarefas no ICS (ADR 0003) · notificações · subtarefas · ordenação manual (arrastar) · anexos.

## 11. Aceite final

- [ ] Gate da F1 (seção 0.3) verde e CI verde
- [ ] Nenhum `@SkipThrottle` restante que exista só para fugir dos throttlers nomeados
- [ ] Casos de uso das seções 2 e 8 passando, com o texto do caso no `it`
- [ ] Tela de tarefas correta em claro e escuro, em 390px e em `lg`
- [ ] Bloco da home leva à lista já filtrada
- [ ] PR com checklist e seção "Decisões" preenchidos
