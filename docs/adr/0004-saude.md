# ADR 0004 — Saúde

| Campo   | Valor                                             |
| ------- | ------------------------------------------------- |
| Status  | Proposto                                          |
| Data    | 2026-10-29                                        |
| Base    | ADR 0003. Substitui a seção 8 (fases) do ADR 0003 |
| Decisor | Bruno                                             |

## 1. Contexto

Bruno quer guardar no Vibru o que ajuda numa emergência médica de um dos dois: tipo sanguíneo, alergias, remédios, condições, contatos. Também quer lembrete de remédio, controle de estoque e histórico de saúde.

## 2. Decisões tomadas na conversa

| #   | Decisão                                                                                          | Consequência aceita                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | **A ficha só existe dentro do app**, sem página pública nem cartão impresso                      | Ajuda o parceiro a informar o socorro; não ajuda quem não tem login. A Ficha Médica nativa do celular fica a cargo de cada um |
| 2.2 | **Sem criptografia por campo**                                                                   | A proteção depende da VPS, do banco e dos backups. Ver seção 5                                                                |
| 2.3 | Escopo: ficha, remédios com lembrete, estoque e histórico                                        | Dividido em 2 fases (seção 6)                                                                                                 |
| 2.4 | **Sem aba nova.** As 5 abas continuam. Saúde entra pelo menu dos avatares e por um bloco na home | —                                                                                                                             |
| 2.5 | **Lembrete de remédio reaproveita Tarefas**, e Tarefas ganha categorias                          | Sem modelo próprio de doses. Remédio diário gera tarefa diária                                                                |
| 2.6 | **Estoque baixo pergunta** se deve adicionar o remédio à lista "Farmácia"                        | Depende de Listas (F3)                                                                                                        |

## 3. Modelo

**Ficha (um registro por membro)**

| Tabela               | Campos                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health_profiles`    | `member_id` (único), `blood_type` (`A+`…`O-` ou `unknown`), `organ_donor` (bool, nulo = não informado), `health_plan_name`, `health_plan_number`, `preferred_hospital`, `notes`                                        |
| `allergies`          | `member_id`, `substance`, `reaction`, `severity` (`mild`, `moderate`, `severe`)                                                                                                                                        |
| `health_conditions`  | `member_id`, `name`, `since_on` (date, nulo), `notes`                                                                                                                                                                  |
| `emergency_contacts` | `member_id`, `name`, `relationship`, `phone`                                                                                                                                                                           |
| `doctors`            | `member_id`, `name`, `specialty`, `phone`, `notes`                                                                                                                                                                     |
| `medications`        | `member_id`, `name`, `dosage` (texto: "500 mg"), `instructions`, `times` (lista `HH:MM`), `is_continuous`, `stock_units` (nulo = não controla), `units_per_dose`, `low_stock_days` (padrão 7), `low_stock_prompted_at` |

Todas com `coreColumns` e `couple_id`. Ambos os membros veem e editam a ficha dos dois.

**Histórico (fase 2)**: `health_events` com `member_id`, `kind` (`appointment`, `exam`, `vaccine`, `surgery`, `hospitalization`), `occurred_on`, `title`, `doctor_id` (nulo), `notes`.

**Tarefas ganham:**

| Campo           | Regra                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `category`      | Enum `home`, `health`, `shopping`, `bills`, `other`. Padrão `other`. Filtro por categoria na tela |
| `due_time`      | `time` opcional (`HH:MM`, horário de São Paulo). Ordena dentro do dia                             |
| `medication_id` | FK opcional para `medications`. Só o sistema preenche                                             |

## 4. Regras

| #   | Regra                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **Remédio gera tarefas.** Para cada horário de um remédio ativo, existe uma tarefa recorrente diária: categoria `health`, responsável = dono do remédio, título "Tomar {nome} {dosagem}", `due_time` = horário, `medication_id` preenchido                                                         |
| 4.2 | Mudar os horários do remédio sincroniza as tarefas na mesma transação: cria as que faltam e exclui (lógico) as que sobraram. Desativar o remédio exclui as tarefas abertas dele                                                                                                                    |
| 4.3 | A tarefa de remédio não pode ter título, responsável, categoria ou recorrência editados pela tela de Tarefas (400). Muda-se pelo remédio                                                                                                                                                           |
| 4.4 | **Concluir** uma tarefa de remédio com estoque controlado desconta `units_per_dose` na mesma transação. **Desfazer** devolve                                                                                                                                                                       |
| 4.5 | **Estoque baixo:** dias restantes = `stock_units / (units_per_dose × nº de horários)`, arredondado para baixo. Se ficar ≤ `low_stock_days` e `low_stock_prompted_at` for nulo, a resposta da conclusão traz `lowStock: { medicationId, name, daysLeft }` e o sistema grava `low_stock_prompted_at` |
| 4.6 | O web mostra um `Dialog`: "{nome} acaba em N dias. Adicionar à lista Farmácia?". **Sim** adiciona o item à lista Farmácia (criada pelo sistema na primeira vez, sem duplicar item aberto com o mesmo texto). **Agora não** só fecha. Nos dois casos, só volta a perguntar depois de uma reposição  |
| 4.7 | **Reposição:** aumentar `stock_units` limpa `low_stock_prompted_at`                                                                                                                                                                                                                                |
| 4.8 | **Modo emergência:** tela única por pessoa, com fonte grande e só o essencial, nesta ordem: tipo sanguíneo, alergias graves primeiro, remédios em uso, condições, contatos de emergência (botão de ligar, `tel:`), plano e hospital                                                                |

## 5. Segurança (sem criptografia por campo)

| #   | Medida                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Nenhum campo de saúde aparece em log: o pino ganha redação para os corpos e respostas das rotas `/health/*` e para o título de tarefas de remédio |
| 5.2 | O backup do banco, quando for definido, nasce criptografado com a `BACKUP_ENCRYPTION_KEY`. Até lá, não há backup fora da VPS com esses dados      |
| 5.3 | Isolamento por casal igual aos outros módulos (404 para outro casal)                                                                              |
| 5.4 | Saúde nunca entra no feed ICS                                                                                                                     |

## 6. Fases (substitui a seção 8 do ADR 0003)

| Fase | Conteúdo                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| F1   | Casal e base visual (feita)                                                                                                                |
| F2   | Tarefas (feita)                                                                                                                            |
| F3   | Listas                                                                                                                                     |
| F4   | Saúde 1: categorias e horário em Tarefas, ficha completa, remédios, tarefas de remédio, estoque e Farmácia, modo emergência, bloco na home |
| F5   | Saúde 2: histórico                                                                                                                         |
| F6   | Agenda e feed ICS                                                                                                                          |
| F7   | Desejos e Presentes                                                                                                                        |
| F8   | Home final em bento e smoke E2E completo                                                                                                   |

## 7. Pontos para a aprovação

Fechados com o padrão abaixo, salvo objeção.

| #   | Ponto                                                          | Padrão proposto                                                        |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Tarefas de remédio contam nos blocos "N tarefas hoje" da home? | Não. A home ganha uma linha própria, "Remédios de hoje: 1 de 2"        |
| 2   | Tarefas de remédio aparecem na tela de Tarefas?                | Sim, na categoria Saúde; o filtro "sem remédios" vem ligado por padrão |
| 3   | Quem edita a ficha de quem                                     | Os dois editam as duas fichas                                          |
| 4   | Remédio com dose "quando precisar" (sem horário)               | Entra na ficha, sem tarefa e sem estoque automático                    |
| 5   | Categorias de tarefa                                           | Casa, Saúde, Compras, Contas, Outros                                   |
