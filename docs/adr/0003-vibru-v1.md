# ADR 0003 — Vibru v1

| Campo   | Valor                                          |
| ------- | ---------------------------------------------- |
| Status  | Aceito em 2026-10-28                           |
| Data    | 2026-10-28                                     |
| Base    | ADR 0002 (template enxuto v1) continua valendo |
| Decisor | Bruno                                          |

---

## 1. Contexto

O Vibru é um webapp de gerenciamento do casamento, usado só por Bruno e pela esposa. A referência de produto é o app Krivo (imagens em `images/`), mas o Vibru tem escopo e identidade visual próprios.

O repositório é um fork do starter-template. Tudo o que o ADR 0002 decidiu (monorepo, NestJS, Next, Drizzle, auth, e-mail, testes por caso de uso, fluxo de spec) continua valendo. Este ADR registra apenas o que é específico do Vibru.

## 2. Escopo do v1

| #   | Módulo            | O que entrega                                                                                                         |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Casal             | Entidade `couples`, membros com cor, datas-base (namoro e casamento), configurações do casal                          |
| 2   | Tarefas           | Tarefa do Bruno, dela ou "nós"; prazo opcional; recorrência simples; agrupamento Hoje / Esta semana / Mais pra frente |
| 3   | Listas            | Listas genéricas com itens marcáveis (mercado, filmes, cafés...)                                                      |
| 4   | Agenda            | Calendário mensal, eventos, datas importantes (aniversários), bodas e aniversário de namoro calculados                |
| 5   | Desejos           | Do casal; categorias: filme, música, viagem, fazer a dois, ideia de rolê, outro; "Planejar" vira evento               |
| 6   | Presentes         | Lista individual (roupa, acessório, outro), com reserva oculta para o dono                                            |
| 7   | Feed ICS          | Assinatura no calendário do celular, com aniversários, bodas/namoro e eventos                                         |
| 8   | Início            | Bento com contador, tarefas de cada um, próxima data, bodas, lista em andamento e ideia de rolê                       |
| 9   | PWA               | Manifest, ícones e "Adicionar à tela inicial"; sem service worker de push                                             |
| 10  | Identidade visual | C2 (claro) + C3 (noite), seção 6                                                                                      |

**Fora do v1**

| Item                        | Quando entra                                        |
| --------------------------- | --------------------------------------------------- |
| Pergunta do dia + sequência | v2                                                  |
| Web Push                    | Se o ICS não bastar                                 |
| Upload de foto              | v2, como fallback do `og:image`                     |
| Tempo real entre celulares  | Não entra; `refetchOnWindowFocus` + update otimista |
| Offline                     | Não entra                                           |
| Mêsversário                 | Não entra                                           |

## 3. Decisões de domínio

| #   | Decisão                                                                                                                                                                                                            | Por quê                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1   | **Casal explícito.** Tabela `couples` e `couple_id` em todo registro de domínio. Toda query de domínio filtra pelo casal do usuário logado                                                                         | Custa pouco agora e deixa o caminho aberto se um dia virar produto                            |
| 2   | **Membros:** tabela `couple_members` (`couple_id`, `user_id` único, `display_name`, `color`: `blue` ou `purple`). Usuário sem casal recebe 403 `COUPLE_REQUIRED` em toda rota de domínio                           | Liga o usuário ao casal e à cor sem mexer em `people`                                         |
| 3   | **Dono de um item:** `assignee_member_id` nulo significa "nós"                                                                                                                                                     | Três estados (Bruno, ela, nós) sem enum extra                                                 |
| 4   | **Datas sem fuso.** Data de calendário (aniversário, namoro, casamento, prazo, dia de evento) é `date`. Horário de evento é `time` opcional. Todo cálculo de "em N dias" usa `America/Sao_Paulo`, fixo no `shared` | `timestamptz` erra o dia perto da meia-noite                                                  |
| 5   | **29 de fevereiro** cai em 28/02 nos anos não bissextos                                                                                                                                                            | Regra única, testável                                                                         |
| 6   | **Recorrência fechada:** `recurrence_kind` (`none`, `daily`, `weekly`, `monthly`, `yearly`) + `recurrence_interval` (≥ 1). Concluir uma tarefa recorrente cria a próxima ocorrência na mesma transação             | RRULE completo é complexidade sem pedido real; gerar ao concluir evita instâncias pré-criadas |
| 7   | **Bodas e aniversário de namoro não são linhas no banco.** São calculados a partir de `couples.married_on` e `couples.dating_started_on`. A tabela de nomes das bodas fica no `shared`                             | Uma fonte de verdade; mudar a data do casamento corrige tudo                                  |
| 8   | **Datas importantes** (`important_dates`) cobrem aniversários de pessoas (do casal ou não) e datas avulsas, com repetição anual                                                                                    | Aniversário de sogra, amigo etc. entra no mesmo lugar                                         |
| 9   | **Desejos** (`wishes`) são do casal, com `category`, `url`, `image_url`, `price_cents`, `done_at`. "Planejar" cria um evento ligado ao desejo (`events.wish_id`)                                                   | Ideias de rolê são uma categoria de desejo, não um módulo à parte                             |
| 10  | **Presentes** (`gifts`) têm `owner_member_id`, `reserved_by_member_id`, `reserved_at`, `received_at`. **Quando quem pede é o dono, a API remove os campos de reserva da resposta.** O front não decide isso        | Esconder só no front não mantém a surpresa; a regra precisa de caso de uso na API             |
| 11  | **`og:image`:** ao salvar um desejo ou presente com `url`, a API busca a imagem de forma síncrona (timeout de 3 s). Se falhar, salva sem imagem                                                                    | Sem storage nem bucket no v1                                                                  |
| 12  | **Valor em centavos** (`integer`), exibido em BRL                                                                                                                                                                  | Sem ponto flutuante em dinheiro                                                               |

## 4. Segurança

| #   | Decisão                                                                                                                                                                                                                                        | Por quê                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | **Isolamento por casal:** recurso de outro casal responde 404, não 403                                                                                                                                                                         | Não confirma que o id existe                                                                     |
| 2   | **Busca do `og:image` com proteção contra SSRF:** só `http` e `https`; resolve o DNS e bloqueia IP privado, loopback, link-local e metadata (inclusive depois de redirect); no máximo 3 redirects; resposta limitada a 1 MB; só lê o `<head>`  | O servidor buscar uma URL informada pelo usuário é o caso clássico de SSRF, mesmo com 2 usuários |
| 3   | **Feed ICS:** `GET /api/ics/:token.ics`, `@Public()` (calendário externo não envia cookie). Token de 32 bytes aleatórios, guardado só como hash SHA-256, um por membro, revogável e regenerável nas configurações. Token revogado responde 404 | A URL é a credencial. Risco aceito: quem tiver a URL vê a agenda (sem tarefas nem presentes)     |
| 4   | **O ICS nunca inclui presentes nem reservas**                                                                                                                                                                                                  | O calendário é sincronizado em serviços de terceiros                                             |
| 5   | **Sessão de 90 dias:** `AUTH_REFRESH_TTL_DAYS=90` (o schema já aceita até 90). Rotação e detecção de reuso continuam                                                                                                                           | App de casa; logar toda semana é atrito. Risco aceito para 2 usuários                            |

## 5. O que o template traz e como fica

Nada é removido. O que não é usado no v1 fica desligado.

| Item do template              | No Vibru                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro público              | `registration_enabled` desligado também em dev                                                                                                                 |
| Seed do admin                 | Passa a criar o casal e os 2 membros: Bruno (`ADMIN_EMAIL`, role `admin`) e ela (`PARTNER_EMAIL`, role `user`), com as datas-base do env. Continua idempotente |
| Convite                       | Mantido, sem uso no v1. Convite aceito não cria vínculo com casal (o usuário fica com `COUPLE_REQUIRED`)                                                       |
| E-mail, fila e worker         | Mantidos (reset de senha e confirmação)                                                                                                                        |
| Gestão de usuários e settings | Mantidas, só para o admin                                                                                                                                      |
| CPF                           | Continua opcional; não aparece nas telas do Vibru                                                                                                              |
| Landing (`/`)                 | Redireciona para `/app` (logado) ou `/login`                                                                                                                   |

## 6. Identidade visual (C2 + C3)

Referência: canvas "Vibru — Identidade visual", artboards C2 e C3. O valor de cada token fica só no `globals.css`, como manda o `DESIGN.md`. A tabela abaixo é o ponto de partida.

| Token                            | Claro (C2)            | Noite (C3)            | Uso                                  |
| -------------------------------- | --------------------- | --------------------- | ------------------------------------ |
| `background`                     | `#F8F3EE`             | `#1C1820`             | Fundo da página                      |
| `card`                           | `#FFFFFF`             | `#2A2430`             | Bloco neutro                         |
| `border`                         | `#EFE6DC`             | `#352E3D`             | Borda de bloco                       |
| `foreground`                     | `#2B2440`             | `#F3ECE4`             | Texto                                |
| `muted-foreground`               | `#6E6580`             | `#A79FB3`             | Texto secundário                     |
| `primary` ("nós")                | `#3B2F5C`             | `#F3E8DA`             | Destaque, aba ativa, botão principal |
| `primary-foreground`             | `#FFF7EE`             | `#2B2440`             |                                      |
| `sand` / `sand-foreground`       | `#F1E4D3` / `#5A4632` | `#3A2E26` / `#F1D9BF` | Bodas e datas do casal               |
| `blue-tile` / `blue-on-tile`     | `#D9E5FA` / `#1E3A8A` | `#233455` / `#C7D8FF` | Bloco do Bruno                       |
| `blue-strong`                    | `#2F5FD0`             | `#7EA6FF`             | Ponto, check, etiqueta do Bruno      |
| `purple-tile` / `purple-on-tile` | `#E9DEFA` / `#4C1D95` | `#362A52` / `#DCCBFF` | Bloco dela                           |
| `purple-strong`                  | `#7C3AED`             | `#B79CFF`             | Ponto, check, etiqueta dela          |

| #   | Decisão                                                                                                                                                | Por quê                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | Cada pessoa tem 3 tons por tema: bloco, texto sobre o bloco e destaque forte                                                                           | Pastel funciona em bloco grande, mas some num ponto ou etiqueta      |
| 2   | A cor da pessoa vem de `couple_members.color` (`blue`/`purple`), nunca do nome                                                                         | Os componentes não sabem quem é quem                                 |
| 3   | Fontes por `next/font`: Bricolage Grotesque (títulos e números) e Nunito (texto)                                                                       | Sem request externo em runtime; Nunito arredondada é parte do "cozy" |
| 4   | Cantos de 24–28px em blocos; navegação inferior flutuante com 5 abas: Início, Tarefas, Listas, Agenda, Desejos. Presentes é uma aba interna de Desejos | 6 abas não cabem bem em 390px                                        |
| 5   | Tema padrão: sistema (o `next-themes` já existe)                                                                                                       | De dia C2, à noite C3, sem configurar                                |
| 6   | Home em bento de 2 colunas no mobile e 4 a partir de `lg`. Bloco opcional sem dado não aparece; os demais sobem na grade, sem buraco                   | Estado vazio sem layout quebrado                                     |

## 7. Casos de uso novos (catálogo)

| Funcionalidade | Caso de uso                                                     | Esperado                                                                    |
| -------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Casal          | Usuário sem casal acessa uma rota de domínio                    | 403 `COUPLE_REQUIRED`                                                       |
|                | Membro de outro casal busca uma tarefa deste casal pelo id      | 404                                                                         |
| Tarefas        | Membro conclui uma tarefa semanal                               | A próxima nasce com prazo +7 dias                                           |
|                | Membro cria tarefa sem responsável                              | Aparece como "nós" para os dois                                             |
| Presentes      | Ela reserva um presente do Bruno; Bruno lista os presentes dele | O item vem sem os campos de reserva                                         |
|                | Ela lista os presentes do Bruno                                 | Vê que ela mesma reservou                                                   |
|                | Bruno tenta reservar um presente da própria lista               | 422                                                                         |
| Desejos        | Membro salva um desejo com URL que aponta para IP interno       | Salva sem imagem; nenhuma requisição ao IP interno                          |
|                | Membro planeja um desejo                                        | Evento criado e ligado ao desejo                                            |
| Agenda         | Aniversário em 29/02 consultado num ano não bissexto            | Aparece em 28/02                                                            |
|                | Data do casamento muda                                          | Bodas e contador recalculados na próxima consulta                           |
| ICS            | Calendário busca o feed com token válido                        | 200 `text/calendar` com aniversários, bodas/namoro e eventos; sem presentes |
|                | Calendário busca com token revogado ou inexistente              | 404                                                                         |
|                | Membro regenera o token                                         | O antigo passa a responder 404                                              |

## 8. Fases

Uma spec por fase, back e tela juntos (ADR 0002, seção 7).

| Fase | Conteúdo                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | Casal e base visual: `couples`, `couple_members`, seed do casal, configurações do casal, `COUPLE_REQUIRED`, tokens C2/C3, fontes, shell com nav de 5 abas, PWA, landing redirecionando, sessão de 90 dias |
| F2   | Tarefas                                                                                                                                                                                                   |
| F3   | Listas                                                                                                                                                                                                    |
| F4   | Agenda: eventos, datas importantes, bodas e namoro, feed ICS                                                                                                                                              |
| F5   | Desejos e Presentes, com `og:image` protegido                                                                                                                                                             |
| F6   | Home em bento, juntando os módulos; smoke E2E mobile do fluxo principal                                                                                                                                   |

## 9. Riscos

| Risco                                                     | Mitigação                                                                                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| O Google Agenda atualiza a assinatura ICS devagar (horas) | Aceito. O iPhone atualiza mais rápido; Web Push fica como próximo passo                      |
| `og:image` bloqueado por alguns sites                     | Salva sem imagem; upload na v2                                                               |
| Fork divergir do template e dificultar trazer melhorias   | Nada foi removido; as mudanças ficam em módulos novos, no seed e no `globals.css`            |
| `couple_id` esquecido numa query nova                     | Repositórios de domínio recebem `coupleId` obrigatório; caso de uso de isolamento por módulo |
| Bloco do bento sem dado deixar a home estranha            | Regra 6.6 e estado vazio definido na F6                                                      |

## 10. Pontos para a aprovação

Fechados com o padrão abaixo, salvo objeção.

| #   | Ponto                                   | Padrão proposto                                  |
| --- | --------------------------------------- | ------------------------------------------------ |
| 1   | Role dela                               | `user` (só o Bruno vê usuários e settings)       |
| 2   | Token ICS                               | Um por membro                                    |
| 3   | Tabela de bodas                         | Do 1º ao 60º ano, nomes tradicionais brasileiros |
| 4   | Presente recebido                       | Sai da lista ativa e vai para "Recebidos"        |
| 5   | Nome do app no título, manifest e ícone | "Vibru"                                          |
