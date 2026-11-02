# Spec Vibru F4 — Saúde 1

Branch `feat/vibru-f4-saude` → PR para `main`. Executor único, modo autônomo.

Base: ADR 0004 (`docs/adr/0004-saude.md`). Esta spec só traduz o ADR em entregas; onde ela escolhe algo que o ADR não fechou, a linha traz **(palpite)** e o executor registra em "Decisões" no PR.

## 0. Regras de execução

**Preparação (antes de qualquer entrega).**

```bash
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git log --oneline -3          # deve mostrar o merge da F3 (PR #3) e o ADR 0004
git checkout -b feat/vibru-f4-saude
git add docs/specs/vibru-F4-saude.md
git commit -m "docs: add vibru f4 spec"
git push -u origin feat/vibru-f4-saude
```

Se o `pull --ff-only` falhar ou a `main` não contiver a F3 e o ADR 0004, pare e informe (parada obrigatória). Não apague branches nem faça `reset`.

As regras 0.1 a 0.9 da spec da F1 valem sem mudança: leitura prévia, um commit por entrega, gate pré-push completo (inclusive `pnpm e2e`), testes só por caso de uso, nenhuma dependência nova, nada de instalar programas, decisão não coberta registrada no PR, paradas obrigatórias e retomada pelo checklist do PR.

**Modelos a copiar.** Tarefas (`apps/api/src/modules/tasks`, `packages/shared/src/tasks`, `apps/web/src/features/tasks`) e Listas (F3). Leia só o que for escrever o equivalente. Nunca abra `pnpm-lock.yaml`, `migrations/meta/*` nem `node_modules`.

## 1. Objetivo

Guardar o que ajuda numa emergência médica de cada um dos dois e lembrar dos remédios sem criar um sistema de doses:

- Tarefas ganha **categoria** e **horário**.
- Cada membro tem uma **ficha** (tipo sanguíneo, alergias, condições, contatos de emergência, médicos, plano e hospital).
- **Remédios** com horários geram **tarefas diárias** na categoria Saúde.
- **Estoque** desconta ao concluir a tarefa e, quando está acabando, oferece adicionar o remédio à lista **Farmácia** (F3).
- **Modo emergência**: tela única, fonte grande, só o essencial.
- Saúde entra pelo menu dos avatares e por uma linha na home. **Sem aba nova.**

## 2. Decisões fechadas

| #    | Decisão                                                                                                                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Decisões 2.1 a 2.6 e regras 4.1 a 4.8 do ADR 0004 valem como estão. Os 5 pontos da seção 7 do ADR valem com o padrão proposto                                                                                                                                                                                                 |
| 2.2  | Os dois membros leem e editam as duas fichas. Todo acesso é por `memberId` do mesmo casal; membro de outro casal ou uuid inválido responde 404 `HEALTH_MEMBER_NOT_FOUND`                                                                                                                                                      |
| 2.3  | **Prefixo de rota `/health`** para tudo da ficha e dos remédios, para a redação do log (ADR 5.1) cobrir por prefixo. Tarefas continua em `/tasks`                                                                                                                                                                             |
| 2.4  | Itens da ficha (alergia, condição, contato, médico, remédio) têm exclusão lógica, igual às outras tabelas. Ordenação: alergias `severe` → `moderate` → `mild`, depois `createdAt`; os demais por `createdAt` **(palpite)**                                                                                                    |
| 2.5  | Remédio: `name` 1–80, `dosage` 0–40, `instructions` 0–200, `times` 0 a 6 horários `HH:MM` únicos e ordenados, `isContinuous` bool. **`times` vazio = "quando precisar"**: sem tarefa e sem estoque automático (ADR ponto 4)                                                                                                   |
| 2.6  | `unitsPerDose` inteiro ≥ 1 (padrão 1) e `stockUnits` inteiro ≥ 0 ou nulo **(palpite: sem dose fracionada, "meio comprimido" fica fora)**. `lowStockDays` inteiro 1–60, padrão 7                                                                                                                                               |
| 2.7  | **Tarefa de remédio** (ADR 4.1): `category = health`, responsável = dono do remédio, título `Tomar {name} {dosage}` (sem espaço sobrando se `dosage` vazio), `due_time` = horário, recorrência diária ancorada em **hoje (São Paulo)** na criação **(palpite: o primeiro prazo é hoje mesmo que o horário já tenha passado)** |
| 2.8  | Sincronização (ADR 4.2) compara os horários atuais com as tarefas abertas do remédio: cria as que faltam, exclui logicamente as que sobraram, atualiza `name`/`dosage`/responsável nas que ficam. Tudo na mesma transação                                                                                                     |
| 2.9  | Tarefa de remédio é **travada** na tela de Tarefas (ADR 4.3): `PATCH` com `title`, `assigneeMemberId`, `category`, `dueTime`, `dueOn` ou `recurrence`, e `DELETE`, respondem 400 `TASK_MEDICATION_LOCKED`. `notes` é permitido **(palpite)**                                                                                  |
| 2.10 | Concluir (ADR 4.4) desconta `unitsPerDose` do estoque, mínimo 0, na transação da conclusão; reabrir devolve a mesma quantidade. Remédio sem estoque controlado não mexe em nada                                                                                                                                               |
| 2.11 | `lowStock` (ADR 4.5) só aparece na resposta da conclusão. Dias restantes = `floor(stockUnits / (unitsPerDose × nº de horários))`. `low_stock_prompted_at` é gravado na mesma transação, então a pergunta aparece uma única vez                                                                                                |
| 2.12 | Responder "Sim" chama `POST /health/medications/:id/pharmacy`: acha a lista ativa do casal chamada "Farmácia" (comparação sem diferenciar maiúsculas e acentos **(palpite)**), cria se não houver, e adiciona um item com o nome do remédio, sem duplicar item aberto igual. Devolve a lista e o item                         |
| 2.13 | **Reposição** (ADR 4.7): `PATCH` do remédio que aumenta `stockUnits` limpa `lowStockPromptedAt`                                                                                                                                                                                                                               |
| 2.14 | Categorias de tarefa (ADR ponto 5): `home`, `health`, `shopping`, `bills`, `other`, padrão `other`. Rótulos: Casa, Saúde, Compras, Contas, Outros. Tarefas existentes ficam `other`                                                                                                                                           |
| 2.15 | `due_time`: `HH:MM` ou nulo. Só vale com `dueOn` preenchido (400 `TASK_DUE_TIME_INVALID` no campo `dueTime`). Ordena dentro do dia: com horário em ordem, sem horário depois                                                                                                                                                  |
| 2.16 | **Home:** não conta tarefas de remédio em "N tarefas hoje". Ganha a linha "Remédios de hoje: N de M" (ADR ponto 1), calculada no web a partir de `/tasks` (tarefas com `medicationId` abertas com prazo ≤ hoje, mais as concluídas hoje). Sem remédio com horário, a linha não renderiza **(palpite: sem endpoint novo)**     |
| 2.17 | **Tela de Tarefas:** filtro por categoria (chips) e chave "Mostrar remédios", desligada por padrão (ADR ponto 2). Remédios de hoje continuam acessíveis no bloco da home                                                                                                                                                      |
| 2.18 | **Log:** redação no pino do corpo e da resposta de `/health/*` e do `title` de tarefas com `medicationId` (ADR 5.1). Saúde nunca entra em auditoria em texto nem no ICS                                                                                                                                                       |
| 2.19 | Telefone: reutilize o schema de telefone já existente em `packages/shared`; se não houver, `string` `trim` de 8 a 20 caracteres com dígitos, espaço, `+`, `-`, `(` e `)`                                                                                                                                                      |

## 3. Banco

Migrations em sequência, cada uma com nome próprio (`pnpm db:generate <nome>`), todas com `coreColumns` e `couple_id` (FK `couples.id`, `on delete cascade`, índice). `member_id` é FK `couple_members.id` `on delete cascade`, not null, índice.

1. `create_health_profiles`: `health_profiles` (`member_id` **único**, `blood_type` enum `A+ A- B+ B- AB+ AB- O+ O- unknown` padrão `unknown`, `organ_donor` bool nulo, `health_plan_name`, `health_plan_number`, `preferred_hospital`, `notes`, todos texto nulo).
2. `create_health_records`: `allergies` (`substance` not null, `reaction`, `severity` enum `mild moderate severe`), `health_conditions` (`name` not null, `since_on` date nulo, `notes`), `emergency_contacts` (`name`, `relationship`, `phone`, todos not null), `doctors` (`name` not null, `specialty`, `phone`, `notes`).
3. `create_medications`: `medications` (`name` not null, `dosage`, `instructions`, `times` `text[]` not null padrão `{}`, `is_continuous` bool not null padrão `true`, `stock_units` int nulo, `units_per_dose` int not null padrão 1, `low_stock_days` int not null padrão 7, `low_stock_prompted_at` timestamptz nulo). Check: `stock_units >= 0`, `units_per_dose >= 1`.
4. `add_task_category_time_medication`: em `tasks`, `category` (enum `task_category`, not null, padrão `other`), `due_time` (`time` nulo), `medication_id` (uuid nulo, FK `medications.id` `on delete set null`, índice). Check: `due_time IS NULL OR due_on IS NOT NULL`.

Exportar entities em `apps/api/src/database/schema.ts`. `pnpm db:migrate` em banco limpo cria tudo e a prova de atomicidade continua verde.

## 4. Contratos (`packages/shared/src/health/` e `tasks/`)

**Tasks (alterações):** `TASK_CATEGORIES`, `taskCategorySchema`, `taskDueTimeSchema` (`HH:MM`, 00:00–23:59). `taskSchema` ganha `category`, `dueTime: string | null`, `medicationId: uuid | null`. `createTaskRequestSchema`/`updateTaskRequestSchema` ganham `category` (opcional) e `dueTime` (opcional, nulo limpa). A resposta de `complete` ganha `lowStock: { medicationId, name, daysLeft } | null`. Novos códigos: `TASK_MEDICATION_LOCKED` (400), `TASK_DUE_TIME_INVALID` (400). Helper puro `compareTasksByDue` passa a considerar `dueTime`; helper puro `medicationProgressToday(tasks, today)` devolve `{ done, total }` (2.16).

**Health (novo):**

| Export                                                                             | Definição                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BLOOD_TYPES`, `ALLERGY_SEVERITIES`                                                | Constantes dos enums                                                                                                                                      |
| `healthProfileSchema` + `updateHealthProfileRequestSchema`                         | Campos da tabela 1; textos `trim`, até 200 (`notes` até 1000)                                                                                             |
| `allergySchema`, `healthConditionSchema`, `emergencyContactSchema`, `doctorSchema` | `{ id, ...campos, createdAt }` e os respectivos `create*RequestSchema`/`update*RequestSchema` (update parcial com ao menos um campo)                      |
| `medicationSchema`                                                                 | `{ id, memberId, name, dosage, instructions, times, isContinuous, stockUnits, unitsPerDose, lowStockDays, createdAt }` (nunca expõe `lowStockPromptedAt`) |
| `createMedicationRequestSchema` / `updateMedicationRequestSchema`                  | Regras 2.5 e 2.6; mensagens em português no padrão do projeto                                                                                             |
| `healthRecordSchema`                                                               | `{ memberId, memberName, profile, allergies[], conditions[], contacts[], doctors[], medications[] }` (ordem 2.4)                                          |
| `pharmacyResultSchema`                                                             | `{ list: { id, title }, item: { id, title }, alreadyListed: boolean }`                                                                                    |
| `HEALTH_ERROR_CODES`                                                               | `HEALTH_MEMBER_NOT_FOUND`, `HEALTH_ITEM_NOT_FOUND`, `MEDICATION_NOT_FOUND` (todos 404)                                                                    |
| Helper puro `daysOfMedicationLeft`                                                 | Fórmula da 2.11                                                                                                                                           |

Exportar tudo em `packages/shared/src/index.ts`.

## 5. API (`apps/api/src/modules/health/`)

Módulo `health` (`entity`/`repository`/`service`/`controller`, divididos por responsabilidade; nenhum arquivo gigante), registrado no `AppModule` e no `test-app.module`. `@RequiresCouple()` + `CoupleMemberGuard`, sem `@SkipThrottle`. O repositório recebe `coupleId` em todo método.

| Método e rota                                    | Corpo                        | Sucesso              | Efeito                                                             |
| ------------------------------------------------ | ---------------------------- | -------------------- | ------------------------------------------------------------------ |
| `GET /health/members`                            | —                            | 200 `{ members }`    | Os dois membros: `memberId`, `name`, `medicationCount`             |
| `GET /health/members/:memberId`                  | —                            | 200 `healthRecord`   | Ficha completa. Sem perfil salvo, devolve perfil vazio (`unknown`) |
| `PUT /health/members/:memberId/profile`          | `updateHealthProfileRequest` | 200 `profile`        | Upsert do perfil                                                   |
| `POST /health/members/:memberId/allergies`       | `createAllergyRequest`       | 201 `allergy`        | Idem para `conditions`, `contacts` e `doctors`                     |
| `PATCH /health/members/:memberId/allergies/:id`  | `updateAllergyRequest`       | 200 `allergy`        | Idem para os outros três                                           |
| `DELETE /health/members/:memberId/allergies/:id` | —                            | 204                  | Exclusão lógica. Idem para os outros três                          |
| `POST /health/members/:memberId/medications`     | `createMedicationRequest`    | 201 `medication`     | Cria e gera tarefas (2.7), na mesma transação                      |
| `PATCH /health/medications/:id`                  | `updateMedicationRequest`    | 200 `medication`     | Sincroniza tarefas (2.8) e aplica 2.13                             |
| `DELETE /health/medications/:id`                 | —                            | 204                  | Exclusão lógica; exclui logicamente as tarefas **abertas** dele    |
| `POST /health/medications/:id/pharmacy`          | —                            | 200 `pharmacyResult` | Regra 2.12                                                         |

`tasks`: `POST /tasks/:id/complete` e `POST /tasks/:id/reopen` aplicam 2.10 e 2.11 dentro da transação que já existe; `PATCH`/`DELETE` aplicam 2.9. O módulo `health` depende do `tasks` e do `lists` pelos **services exportados**, nunca pelos repositórios deles; evite dependência circular (o `tasks` consulta o estoque por um método do `health`, ou o contrário, mas num único sentido; registre a escolha em "Decisões").

Regras de implementação:

1. Sincronização e estoque ficam em services pequenos e nomeados (`medication-task-sync.service`, `medication-stock.service`), não dentro do controller.
2. Erros seguem o corpo padrão (`statusCode`, `error`, `message`, `code`, `requestId`, `path`, `timestamp`), como em `tasks.service.ts`.
3. Datas como ISO string; `dueTime` e `times` como `HH:MM`.
4. Nenhum campo de saúde em mensagem de erro, log ou auditoria (2.18).

## 6. Web

**Tarefas (alterações)**

| Parte      | Comportamento                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formulário | Campo "Categoria" (`Select`) e "Horário" (`Input type="time"`, habilitado só com prazo). Tarefa de remédio abre o `Sheet` só com `notes` editável e aviso "Mude pelo remédio"                                |
| Lista      | Chips de categoria acima da lista (Todas + 5) e chave "Mostrar remédios", desligada. Mostra o horário ao lado do prazo                                                                                       |
| Concluir   | Se a resposta trouxer `lowStock`, abre o `Dialog` "{nome} acaba em N dias. Adicionar à lista Farmácia?" com "Adicionar" e "Agora não". "Adicionar" chama o `pharmacy` e mostra toast "Adicionado à Farmácia" |

**`/app/health`** (entrada pelo menu dos avatares, item "Saúde"): dois cards, um por membro, com nome, "N remédios" e o botão "Emergência". Tocar abre `/app/health/:memberId`.

**`/app/health/:memberId`** (ficha): cabeçalho com nome e botão "Modo emergência". Seções em `Card`: Perfil (tipo sanguíneo, doador, plano, hospital, observações; edita em `Sheet`), Alergias, Condições, Contatos de emergência, Médicos, Remédios. Cada lista tem botão "Adicionar" que abre `Sheet`; tocar no item edita; o `Sheet` tem "Remover" com `Dialog` de confirmação. Alergia `severe` com marcação visual de alerta (cor semântica do tema, não hex). Remédio mostra horários, estoque ("12 unidades · ~6 dias") e, se baixo, um selo "Acabando". Formulário de remédio: nome, dosagem, instruções, horários (lista com adicionar/remover `Input type="time"`), "Uso contínuo", "Controlar estoque" (liga `stockUnits`, `unitsPerDose`, `lowStockDays`).

**`/app/health/:memberId/emergency`**: tela única, fonte grande (≥ 20px), fundo `card`, sem navegação extra, na ordem da ADR 4.8: tipo sanguíneo, alergias graves primeiro, remédios em uso, condições, contatos de emergência com botão "Ligar" (`<a href="tel:...">`, alvo ≥ 56px), plano e hospital. Seção vazia é omitida; sem nada preenchido, mostra "Ficha ainda vazia" e link para preencher.

**Hooks** (`features/health/hooks/use-health.ts`): `useHealthMembers`, `useHealthRecord(memberId)`, `useUpdateHealthProfile`, e um par de hooks de criar/editar/excluir para cada item da ficha, `useCreateMedication`, `useUpdateMedication`, `useDeleteMedication`, `useAddToPharmacy`. Mutações de saúde invalidam `['health']`; as de remédio invalidam também `['tasks']`; `useAddToPharmacy` invalida `['lists']`. Os hooks de tarefas ganham a resposta `lowStock`.

**Home:** linha "Remédios de hoje: N de M" (2.16), dentro do bloco de tarefas ou como linha própria abaixo dele **(palpite)**, com link para `/app/health`. Não renderiza sem tarefas de remédio.

Regras de sempre: mobile-first (base 390px, só `min-width`), sem `max-*`, sem `'use client'` em `page.tsx`, alvos de toque ≥ 44px, sem hex no componente, estados de loading/vazio/erro com retry.

## 7. Casos de uso (aceite da API)

Arquivos `test/saude.int-spec.ts` (ficha e remédios) e acréscimos em `test/tarefas.int-spec.ts` (categoria, horário, travas), usando `createCouple`. O texto do `it` é o texto da tabela.

| Caso de uso                                                          | Esperado                                                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Membro preenche a própria ficha                                      | 200; o outro membro vê o perfil                                                                          |
| Membro edita a ficha da parceira                                     | 200; a mudança aparece para os dois                                                                      |
| Membro salva tipo sanguíneo inválido                                 | 400, erro no campo `bloodType`                                                                           |
| Membro adiciona, edita e remove alergia, condição, contato e médico  | 201 / 200 / 204; a ficha reflete cada passo; alergia grave vem antes                                     |
| Membro adiciona contato sem telefone                                 | 400, erro no campo `phone`                                                                               |
| Membro cria remédio com dois horários                                | 201; existem 2 tarefas diárias `health`, com `dueTime`, `medicationId` e título "Tomar {nome} {dosagem}" |
| Membro cria remédio "quando precisar"                                | 201; nenhuma tarefa criada                                                                               |
| Membro muda os horários do remédio                                   | Tarefas sobrando somem, faltando são criadas, as demais continuam; tudo ou nada                          |
| Membro renomeia o remédio                                            | O título das tarefas abertas muda                                                                        |
| Membro desativa o remédio                                            | Tarefas abertas dele somem; as concluídas ficam                                                          |
| Membro edita título, responsável, prazo ou exclui tarefa de remédio  | 400 `TASK_MEDICATION_LOCKED`                                                                             |
| Membro edita só as notas da tarefa de remédio                        | 200                                                                                                      |
| Membro conclui tarefa de remédio com estoque                         | Estoque cai `unitsPerDose`; a próxima ocorrência nasce para amanhã                                       |
| Membro desfaz a conclusão                                            | Estoque volta                                                                                            |
| Estoque chega a 0 e a conclusão continua                             | Estoque fica em 0, nunca negativo                                                                        |
| Conclusão deixa o estoque abaixo do limite                           | A resposta traz `lowStock` com `daysLeft`; a conclusão seguinte não traz de novo                         |
| Membro repõe o estoque e volta a ficar baixo                         | `lowStock` aparece de novo                                                                               |
| Membro adiciona o remédio à Farmácia                                 | A lista "Farmácia" existe com o item; repetir não duplica (`alreadyListed`)                              |
| Membro usa a Farmácia que já existe com outro caixa ("farmácia")     | Reaproveita a lista, não cria outra                                                                      |
| Membro cria tarefa com categoria e horário                           | 201; a resposta traz `category` e `dueTime`; a lista ordena pelo horário                                 |
| Membro cria tarefa com horário e sem prazo                           | 400, erro no campo `dueTime`                                                                             |
| Tarefas antigas continuam funcionando                                | Categoria `other` e `dueTime` nulo                                                                       |
| Corpo e resposta de `/health/*` não aparecem no log                  | Nenhuma ocorrência do nome do remédio ou da alergia no log capturado                                     |
| Membro de outro casal acessa, edita ou exclui ficha, item ou remédio | 404 `HEALTH_MEMBER_NOT_FOUND` / `HEALTH_ITEM_NOT_FOUND` / `MEDICATION_NOT_FOUND` em todas as rotas       |
| Usuário sem casal acessa a ficha                                     | 403 `COUPLE_REQUIRED`                                                                                    |
| Visitante acessa a ficha                                             | 401                                                                                                      |

**Unidade (shared):** `daysOfMedicationLeft`, `medicationProgressToday` e `compareTasksByDue` com horário.

**E2E** (acrescentar ao `vibru-smoke`): o admin entra, abre Saúde pelo menu do avatar, cadastra tipo sanguíneo e uma alergia grave na própria ficha, cria o remédio "Losartana 50 mg" com um horário e estoque 2 (1 por dose, limite 7 dias). Vai a Tarefas: a tarefa de remédio não aparece; liga "Mostrar remédios" e ela aparece; conclui; o `Dialog` "acaba em N dias" abre; escolhe "Adicionar". Em Listas existe "Farmácia" com "Losartana". A home mostra "Remédios de hoje: 1 de 1". Abre o modo emergência e vê tipo sanguíneo e a alergia. Em 390×844, sem scroll horizontal na home, na ficha e na tela de emergência.

## 8. Entregas (ordem fixa, um commit cada)

0. `docs: add vibru f4 spec` (preparação, seção 0)
1. `feat(shared): health contracts and task category` (seção 4)
2. `feat(api): task category and due time` (migration 4 parcial: categoria e horário; seção 5, tarefas)
3. `feat(api): health records` (migrations 1 e 2, ficha, seção 5)
4. `feat(api): medications and stock` (migration 3 e `medication_id`, remédios, tarefas de remédio, estoque, Farmácia, redação do log)
5. `feat(web): task category and time` (seção 6, tarefas)
6. `feat(web): health record screens` (seção 6, ficha e remédios)
7. `feat(web): emergency mode` (seção 6, emergência)
8. `feat(web): medications on home` (seção 6, home e menu dos avatares)
9. `test(e2e): health flow` (seção 7, E2E)

Se a migration 4 não puder ser dividida entre as entregas 2 e 4 sem quebrar a ordem das FKs, gere `category`/`due_time` na entrega 2 e `medication_id` numa migration própria na entrega 4, e registre em "Decisões".

## 9. Fora de escopo

Histórico de saúde (`health_events`, F5) · cartão impresso, página pública ou QR da ficha · criptografia por campo · notificações push ou e-mail de lembrete · dose fracionada · bula, interação medicamentosa ou busca de remédio · anexos e exames em arquivo · compartilhar a ficha fora do casal · feed ICS · estoque com validade · aba nova na navegação · alterar o fluxo de recorrência das demais tarefas.

## 10. Aceite final

- [ ] Gate da F1 (seção 0.3) verde e CI verde
- [ ] Quatro migrations aplicadas em banco limpo; dados antigos de tarefas intactos
- [ ] Casos de uso da seção 7 passando, com o texto do caso no `it`
- [ ] Tarefa de remédio travada na tela de Tarefas e oculta por padrão
- [ ] Estoque desconta, devolve, nunca fica negativo; pergunta da Farmácia aparece uma vez por reposição
- [ ] Nada de saúde em log (teste de redação)
- [ ] Ficha e emergência corretas em claro e escuro, em 390px e em `lg`
- [ ] Nenhum scroll horizontal nas telas novas e nenhuma regressão em tarefas, listas e home
- [ ] PR com checklist e seção "Decisões" preenchidos
