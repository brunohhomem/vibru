# Spec Vibru F3 — Listas

| Campo     | Valor                                                               |
| --------- | ------------------------------------------------------------------- |
| ADR       | `docs/adr/0003-vibru-v1.md` + `docs/adr/0002-template-enxuto-v1.md` |
| Depende   | F2 mergeada na `main` (PR #2)                                       |
| Executor  | Um agente só (Cursor ou Claude Code), do início ao fim              |
| Modo      | Autônomo: não peça confirmação. Pare só nas paradas da seção 0      |
| Branch/PR | `feat/vibru-f3-listas` → PR para `main`. Nunca faça merge           |

---

## 0. Regras de execução

**Preparação (antes de qualquer entrega).** A F2 já está mergeada no GitHub, mas o clone local pode ainda estar na branch da F1. Confirme:

```bash
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git log --oneline -1          # deve mostrar o merge da F2 (PR #2)
git checkout -b feat/vibru-f3-listas
git add docs/specs/vibru-F3-listas.md
git commit -m "docs: add vibru f3 spec"
git push -u origin feat/vibru-f3-listas
```

Se o `pull --ff-only` falhar ou o último commit da `main` não contiver a F2, pare e informe (parada obrigatória). Não apague as branches locais da F1 nem da F2 e não faça `reset`.

As regras 0.1 a 0.9 da spec da F1 (`docs/specs/vibru-F1-casal-e-base-visual.md`) valem sem mudança: leitura prévia, um commit por entrega, gate pré-push completo (inclusive `pnpm e2e`), testes só por caso de uso, nenhuma dependência nova, nada de instalar programas, decisão não coberta registrada no PR, paradas obrigatórias e retomada pelo checklist do PR.

## 1. Objetivo

Entregar as listas do casal: criar, renomear e excluir listas; adicionar, editar, marcar e desmarcar itens; limpar os marcados; saber quem marcou cada item; ordenar as listas por atividade e os itens com os marcados no fim. A home ganha o bloco "Lista em andamento".

## 2. Decisões fechadas

| #    | Decisão                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | **Lista é do casal.** `lists` e `list_items` guardam `couple_id`; toda query recebe o casal do membro logado. Recurso de outro casal responde 404, nunca 403 (ADR 0003, seção 4)                                                                         |
| 2.2  | **Ordem das listas:** `updated_at` desc, `created_at` desc como desempate. Qualquer mudança na lista ou nos itens atualiza `lists.updated_at`, então a lista mexida por último sobe                                                                     |
| 2.3  | **Ordem dos itens:** abertos primeiro, por `created_at` asc; marcados depois, por `checked_at` desc. O marcado desce para o fim e sai do caminho                                                                                                        |
| 2.4  | **Sem ordenação manual, categoria, quantidade, cor ou emoji.** A lista é título + itens marcáveis. Arrastar, ícone e "quantidade" ficam para quando um projeto pedir                                                                                    |
| 2.5  | **Títulos duplicados são permitidos.** "Mercado" pode existir de novo na semana seguinte; a lista antiga é excluída ou limpa quando não servir mais                                                                                                      |
| 2.6  | **Marcar e desmarcar são idempotentes.** Marcar um item já marcado devolve 200 com o item como está (mantém quem marcou primeiro). Desmarcar um item aberto devolve 200 com o item aberto. Dois celulares tocando o mesmo item não geram erro         |
| 2.7  | **Quem marcou é registrado** em `checked_by_member_id`; desmarcar limpa o campo. O item marcado continua existindo até ser desmarcado, excluído ou removido por "Limpar marcados"                                                                        |
| 2.8  | **Limpar marcados** exclui logicamente (`is_active = false`) todos os itens marcados da lista. Os abertos ficam                                                                                                                                         |
| 2.9  | **Exclusão é lógica nas duas tabelas.** Excluir a lista marca só a lista como inativa; os itens continuam no banco, mas inacessíveis porque toda rota de item resolve a lista ativa antes. Não há restauração no v1                                                  |
| 2.10 | **Bloco "Lista em andamento" na home:** a primeira lista da ordem 2.2 que ainda tem item aberto. Mostra título, "N de M" e uma barra de progresso. Se não houver lista com item aberto, o bloco não aparece (ADR 0003, 6.6). Tocar abre a lista           |
| 2.11 | **Sem throttler novo.** As rotas usam o `default` (120/min). O `AppThrottlerGuard` corrigido na F2 só aplica throttler nomeado onde a rota declara `@Throttle`                                                                            |
| 2.12 | **Sem limite de itens por lista nem de listas por casal.** São dois usuários; um limite só criaria erro sem uso real. Título da lista: 1–60; título do item: 1–200                                                        |

## 3. Banco

Migrations `create_lists` e `create_list_items`, geradas em sequência para saírem com dois nomes. As duas usam `coreColumns`; `pnpm db:migrate` em banco limpo cria tudo e a prova de atomicidade existente continua verde.

**`lists`**

| Coluna      | Tipo | Regras                                                       |
| ----------- | ---- | ------------------------------------------------------------ |
| `couple_id` | uuid | FK `couples.id` **on delete cascade**, not null, índice      |
| `title`     | text | not null (1–60, validado na API)                             |

Índice: (`couple_id`, `updated_at`).

**`list_items`**

| Coluna                  | Tipo        | Regras                                                     |
| ----------------------- | ----------- | ---------------------------------------------------------- |
| `couple_id`             | uuid        | FK `couples.id` **on delete cascade**, not null, índice    |
| `list_id`               | uuid        | FK `lists.id` **on delete cascade**, not null, índice      |
| `title`                 | text        | not null (1–200, validado na API)                          |
| `checked_at`            | timestamptz | null                                                       |
| `checked_by_member_id`  | uuid        | FK `couple_members.id` **on delete set null**, null         |

Índice: (`list_id`, `checked_at`).

Exportar as duas entities em `apps/api/src/database/schema.ts`. As colunas de data continuam com o padrão do projeto (`timestamptz`).

## 4. Contratos (`packages/shared/src/lists/`)

Nenhuma função pura nesta fase; a ordenação e a contagem acontecem na API e o bloco da home só filtra a resposta pronta.

| Export                           | Definição                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `listTitleSchema`                | string `trim`, 1–60; mensagens "Informe o nome da lista" e "Use até 60 caracteres"                                                     |
| `listItemTitleSchema`            | string `trim`, 1–200; mensagens "Informe o item" e "Use até 200 caracteres"                                                            |
| `listItemSchema`                 | `{ id: uuid, title: string, checkedAt: string \| null, checkedByMemberId: uuid \| null, createdAt: string }`                          |
| `listResponseSchema`             | `{ id: uuid, title: string, items: listItem[], createdAt: string, updatedAt: string }`                                                |
| `listSummarySchema`              | `{ id: uuid, title: string, totalItems: number (int ≥ 0), checkedItems: number (int ≥ 0), updatedAt: string }`                        |
| `listsResponseSchema`            | `{ lists: listSummary[] }`                                                                                                           |
| `createListRequestSchema`        | `{ title: listTitleSchema }`                                                                                                         |
| `updateListRequestSchema`        | `{ title: listTitleSchema }`                                                                                                         |
| `createListItemRequestSchema`    | `{ title: listItemTitleSchema }`                                                                                                     |
| `updateListItemRequestSchema`    | `{ title: listItemTitleSchema }`                                                                                                     |

Tipos exportados: `List`, `ListItem`, `ListSummary`, `ListsResponse`, `CreateListRequest`, `UpdateListRequest`, `CreateListItemRequest`, `UpdateListItemRequest`, `ListErrorCode`.

**Códigos de erro** (`LIST_ERROR_CODES`):

| `code`                 | HTTP | Quando                                                                 |
| ---------------------- | ---- | ---------------------------------------------------------------------- |
| `LIST_NOT_FOUND`       | 404  | Lista inexistente, excluída, de outro casal ou uuid malformado         |
| `LIST_ITEM_NOT_FOUND`  | 404  | Item inexistente, excluído, de outra lista/casal ou uuid malformado    |

Exportar tudo em `packages/shared/src/index.ts`.

## 5. API (`apps/api/src/modules/lists/`)

Módulo `lists` no padrão `entity`/`repository`/`service`/`controller`, registrado no `AppModule`. Controller com `@RequiresCouple()` + `CoupleMemberGuard` (padrão da F1), sem `@SkipThrottle`. O repositório recebe `coupleId` em todo método.

| Método e rota                        | Corpo                      | Sucesso              | Efeito                                                     |
| ------------------------------------ | -------------------------- | -------------------- | ---------------------------------------------------------- |
| `GET /lists`                         | —                          | 200 `listsResponse`  | Resumos na ordem 2.2                                       |
| `POST /lists`                        | `createListRequest`        | 201 `listResponse`   | `items: []`; `updatedAt = createdAt`                       |
| `GET /lists/:id`                     | —                          | 200 `listResponse`   | Itens na ordem 2.3                                         |
| `PATCH /lists/:id`                   | `updateListRequest`        | 200 `listResponse`   | Renomeia e atualiza a atividade                            |
| `DELETE /lists/:id`                  | —                          | 204                  | Exclusão lógica 2.9                                        |
| `POST /lists/:id/items`              | `createListItemRequest`    | 201 `listItem`       | Atualiza a atividade da lista                              |
| `PATCH /lists/:id/items/:itemId`     | `updateListItemRequest`    | 200 `listItem`       | Edita o título e atualiza a atividade                      |
| `POST /lists/:id/items/:itemId/check`   | —                       | 200 `listItem`       | Marca com o membro atual; idempotente (2.6)                |
| `POST /lists/:id/items/:itemId/uncheck` | —                       | 200 `listItem`       | Desmarca e limpa quem marcou; idempotente (2.6)            |
| `DELETE /lists/:id/items/:itemId`    | —                          | 204                  | Exclusão lógica do item e atualização da atividade         |
| `DELETE /lists/:id/items/checked`    | —                          | 204                  | Exclusão lógica dos marcados (2.8)                         |

Regras de implementação:

1. **`DELETE /lists/:id/items/checked` declara antes de `DELETE /lists/:id/items/:itemId`** no controller. O Nest casa pela ordem de declaração e `checked` seria capturado como `:itemId`.
2. Toda rota de item resolve primeiro a lista ativa do casal (`LIST_NOT_FOUND`) e depois o item ativo daquela lista (`LIST_ITEM_NOT_FOUND`). Isso impede acessar item de lista excluída.
3. `check`/`uncheck` usam `UPDATE ... WHERE checked_at IS NULL` / `IS NOT NULL RETURNING`. Se nenhuma linha voltar, o service relê o item e devolve o estado atual (idempotência). A troca de estado e o toque em `lists.updated_at` acontecem na mesma transação; se nada mudou, a lista não é tocada.
4. `GET /lists` conta itens ativos no banco (`COUNT` + `COUNT FILTER`), não carrega todos os itens para contar em memória.
5. As respostas de erro seguem o corpo padrão do projeto (`statusCode`, `error`, `message`, `code`, `requestId`, `path`, `timestamp`), como em `tasks.service.ts`.
6. Datas (`createdAt`, `updatedAt`, `checkedAt`) saem como ISO string.
7. `GET /lists` sem listas devolve `{ lists: [] }`, nunca 404.

## 6. Web

**`/app/lists`** (substitui o estado vazio da F1)

| Parte       | Comportamento                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resumo      | Cards das listas na ordem da API: título, "N de M" e barra de progresso fina (`bg-muted` com preenchimento `bg-primary`). Tocar abre `/app/lists/:id`                                                        |
| Criar       | Botão flutuante "Nova lista" acima da barra de navegação, no mesmo lugar do "Nova tarefa". Abre um `Sheet` com o campo nome; salva e fecha, com toast "Lista criada"                                          |
| Estados     | Loading em skeleton de cards, vazio ("Nenhuma lista ainda" + "Crie a primeira no botão Nova lista"), erro com retry                                                                                          |

**`/app/lists/:id`**

| Parte            | Comportamento                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabeçalho        | Link "Listas" de volta, título da lista e menu de ações (`DropdownMenu`, `aria-label="Ações da lista"`): Renomear e Excluir. Renomear abre `Sheet` com o nome atual; Excluir pede confirmação em `Dialog` e, ao concluir, volta para `/app/lists` com toast "Lista excluída" |
| Progresso        | "N de M marcados" abaixo do título, com barra de progresso                                                                                                                                                                                                                                                                    |
| Adicionar item   | Formulário logo abaixo do progresso: `Input` "Novo item" (fonte ≥ 16px) + botão "Adicionar". Envia, limpa o campo, mantém o foco e mostra toast "Item adicionado". Erro da API vai para o campo                                                                                                                              |
| Item aberto      | Círculo de marcar (alvo ≥ 44px, na cor forte de quem está logado), título (tocar abre o `Sheet` de edição) e nada mais à direita. Marcar mostra toast "Marcado" com ação "Desfazer"                                                                                                                                             |
| Item marcado     | Mesma linha, com círculo preenchido, título riscado em `text-muted-foreground` e "marcado por {nome}". Tocar no círculo desmarca; tocar no título abre a edição                                                                                                                                                                 |
| Seção marcados   | `<details>` "Marcados (N)" no fim, fechada por padrão, com o botão "Limpar marcados" (confirmação em `Dialog`)                                                                                                                                                                                                                |
| Edição do item   | `Sheet` com o título e o botão destrutivo "Remover item" (confirmação em `Dialog`). Salvar mostra toast "Item atualizado"; remover mostra "Item removido" e fecha                                                                                                                                                              |
| Estados          | Loading em skeleton de linhas, lista vazia ("Lista vazia" + "Adicione o primeiro item acima"), lista inexistente com `ErrorState` e retry, erro de rede com retry                                                                                                                                                             |
| Otimismo         | Marcar/desmarcar são otimistas: o item muda de seção na hora e volta ao estado anterior se a API falhar. As mutações invalidam a query `['lists']`                                                                                                                                                                            |

**Hooks** (`features/lists/hooks/use-lists.ts`): `useLists` (`['lists']`), `useList` (`['lists', id]`), `useCreateList`, `useRenameList`, `useDeleteList`, `useAddListItem`, `useUpdateListItem`, `useCheckListItem`, `useUncheckListItem`, `useDeleteListItem`, `useClearCheckedItems`. Toda mutação invalida `['lists']`, que também atualiza o bloco da home.

**Home:** bloco 1×1 depois dos blocos dos membros, antes das bodas. Fundo `card` com borda, rótulo "Lista em andamento", título da lista (até 2 linhas), "N de M" e barra de progresso. Link para `/app/lists/:id`. Sem lista com item aberto, não renderiza. A query é a mesma `['lists']` da tela de listas.

Regras de sempre: mobile-first (base 390px e só cresce com `min-width`), sem `max-*`, sem `'use client'` em `page.tsx`, alvos de toque ≥ 44px, sem hex no componente.

## 7. Casos de uso (aceite da API)

Arquivo `test/listas.int-spec.ts`, usando `createCouple` do helper de cenário. O texto do `it` é o texto da tabela.

| Caso de uso                                                          | Esperado                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Membro cria uma lista                                                | 201; a lista aparece para os dois membros, vazia                     |
| Membro cria lista sem nome                                           | 400, erro no campo `title`                                           |
| Membro adiciona um item                                              | 201; o outro membro vê o item                                        |
| Membro adiciona item sem nome                                        | 400, erro no campo `title`                                           |
| Membro marca um item                                                 | 200; o outro vê o item marcado e `checkedByMemberId` de quem marcou   |
| Membro marca o mesmo item de novo                                    | 200; o item continua marcado uma vez, sem erro                       |
| Membro desmarca um item                                              | 200; o item volta para os abertos e `checkedByMemberId` fica nulo     |
| Membro desmarca um item já aberto                                    | 200; o item continua aberto, sem erro                                |
| Membro edita o título de um item                                     | O outro membro vê o título novo                                      |
| Membro exclui um item                                                | O item some para os dois                                             |
| Membro limpa os marcados                                             | Só os marcados somem; os abertos ficam                                |
| Membro renomeia a lista                                              | O outro membro vê o nome novo                                        |
| Membro exclui a lista                                                | A lista some para os dois e o item dela não aparece em lugar nenhum |
| A lista com atividade mais recente aparece primeiro                  | A ordem muda depois de adicionar ou marcar item na outra lista       |
| Itens marcados aparecem depois dos abertos                           | A resposta lista todos os abertos antes dos marcados                 |
| Membro de outro casal acessa, edita ou exclui lista e item deste casal | 404 `LIST_NOT_FOUND` / `LIST_ITEM_NOT_FOUND` em todas as rotas      |
| Usuário sem casal acessa as listas                                   | 403 `COUPLE_REQUIRED`                                                |
| Visitante acessa as listas                                           | 401                                                                  |

**E2E** (acrescentar ao `vibru-smoke`): o admin entra, abre Listas, cria "Mercado da semana", adiciona "Café" e "Pão", marca "Café" e vê "1 de 2". Volta para a home e o bloco "Lista em andamento" mostra a lista e "1 de 2". Abre pelo bloco, marca "Pão", volta para a home e o bloco não aparece mais. Em 390×844, sem scroll horizontal na home, no índice e no detalhe.

## 8. Entregas (ordem fixa, um commit cada)

0. `docs: add vibru f3 spec` (preparação, seção 0)
1. `feat(shared): list contracts` (seção 4)
2. `feat(api): lists module` (seções 3, 5 e casos de uso)
3. `feat(web): lists screens` (seção 6, índice e detalhe)
4. `feat(web): list progress on home` (seção 6, home)
5. `test(e2e): lists flow` (seção 7, E2E)

## 9. Fora de escopo

Ordenação manual (arrastar) · categoria, cor, emoji ou ícone por lista · quantidade/unidade nos itens (mercado) · listas-modelo ou duplicar lista · arquivar listas concluídas · busca entre listas · compartilhar/exportar · restaurar lista ou item excluído · notificações · offline · permissões por lista · listas ou itens no ICS · alterar a aba "Listas" da navegação (ela já existe).

## 10. Aceite final

- [ ] Gate da F1 (seção 0.3) verde e CI verde
- [ ] Migrations `create_lists` e `create_list_items` aplicadas em banco limpo
- [ ] Casos de uso da seção 7 passando, com o texto do caso no `it`
- [ ] Listas e detalhe corretos em claro e escuro, em 390px e em `lg`
- [ ] Marcar/desmarcar idempotente e otimista, com desfazer no toast
- [ ] Bloco "Lista em andamento" aparece, abre a lista e some quando não há item aberto
- [ ] Nenhum scroll horizontal nas telas novas e nenhuma regressão em tarefas e home
- [ ] PR com checklist e seção "Decisões" preenchidos
