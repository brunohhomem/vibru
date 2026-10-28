# Spec Vibru F1 — Casal e base visual

| Campo     | Valor                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| ADR       | `docs/adr/0003-vibru-v1.md` (aceito) + `docs/adr/0002-template-enxuto-v1.md`            |
| Executor  | Um agente só (Cursor ou Claude Code), do início ao fim                                  |
| Modo      | Autônomo: não peça confirmação nem "posso continuar?". Pare só nas paradas da seção 0.8 |
| Branch/PR | `feat/vibru-f1-casal-base-visual` → PR para `main`. Nunca faça merge                    |

---

## 0. Regras de execução

1. **Leia antes:** `AGENTS.md`, `DESIGN.md`, ADR 0003 inteiro, ADR 0002 seções 5 a 7 e `docs/conventions/*`.
2. **Um commit por entrega** da seção 9, em Conventional Commits (inglês). O checklist vai no corpo do PR e é atualizado a cada entrega. Não crie arquivo de progresso.
3. **Gate pré-push** (obrigatório): `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm turbo run build --force`, `pnpm boot:check`, `pnpm test`, `pnpm test:integration` (com `pnpm infra:up`), `pnpm e2e` e cada `run:` do `ci.yml` reproduzido localmente. Falhou: corrija e repita o gate inteiro. Depois do push, acompanhe o CI (`gh run watch`).
4. **Testes:** só casos de uso (seção 8) e as garantias técnicas do ADR 0002. A exceção são as funções puras de data e bodas no `shared`, que levam teste unitário (ADR 0002, seção 5, item 7).
5. **Dependências novas: nenhuma.** `next/font` e `next/og` já vêm com o Next.
6. Não instale programas na máquina. Docker só com os containers do `compose.dev.yaml`. Nada de `docker system prune`, reiniciar o Docker ou mexer em containers de outros projetos.
7. Decisão não coberta aqui nem nos ADRs: escolha a opção mais conservadora e reversível, registre na seção "Decisões" do PR e siga.
8. **Paradas obrigatórias** (as únicas): (a) migration falha a prova de atomicidade; (b) duas regras obrigatórias conflitam sem saída; (c) precisa de dependência nova; (d) falta credencial ou acesso externo; (e) ação destrutiva fora do escopo; (f) uma porta da seção 2 já está ocupada na máquina (informe qual e pare; não escolha outra sozinho).
9. **Retomada:** se a sessão reiniciar, leia o checklist do PR aberto e continue do primeiro item não marcado.

## 1. Objetivo

Transformar o fork em Vibru: portas próprias para rodar ao lado do starter-template, nome do projeto, casal e membros no banco, seed do casal, rota de configurações do casal, identidade visual C2/C3, shell com navegação de 5 abas, home em bento só com o que já existe (contadores), PWA instalável e sessão de 90 dias.

## 2. Portas (rodar ao lado do starter-template)

O starter-template ocupa as portas padrão. O Vibru passa a usar estas:

| Serviço      | Antes       | Vibru   | Onde mudar                                                                                                                                |
| ------------ | ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres     | 15432       | `25432` | `.env.example` (`DB_PORT`)                                                                                                                |
| Redis        | 16379       | `26379` | `.env.example` (`REDIS_PORT`)                                                                                                             |
| Mailpit SMTP | 1025 (fixo) | `21025` | `compose.dev.yaml` → `'127.0.0.1:${SMTP_PORT:-21025}:1025'`; `.env.example` (`SMTP_PORT`); default do `SMTP_PORT` no `env.schema.ts`      |
| Mailpit UI   | 8025 (fixo) | `28025` | `compose.dev.yaml` → `'127.0.0.1:${MAILPIT_UI_PORT:-28025}:8025'`; nova chave `MAILPIT_UI_PORT=28025` no `.env.example` (só o Compose lê) |
| API          | 3001        | `3101`  | `.env.example` (`API_PORT`, `API_ORIGIN`); fallback em `apps/web/next.config.ts`                                                          |
| Web          | 3000        | `3100`  | `apps/web/package.json` (`next dev --port 3100`); `.env.example` (`APP_ORIGIN`, `WEB_ORIGIN`); default de `WEB_ORIGIN` no `env.schema.ts` |

Também:

1. `compose.dev.yaml` ganha `name: vibru` no topo, para containers e volumes não colidirem com outro projeto.
2. `apps/web/playwright.config.ts` e `packages/scripts/e2e-up.mjs`: trocar 3000/3001 por 3100/3101 (`baseURL`, `url`, `--port`, `WEB_ORIGIN`, `API_ORIGIN`) e o fallback de `DB_PORT` para `25432`.
3. `.github/workflows/ci.yml`: trocar `3000`→`3100` e `3001`→`3101` em `API_PORT`, `APP_ORIGIN`, `WEB_ORIGIN` e `API_ORIGIN`. As portas de Postgres, Redis e Mailpit **do CI** não mudam (o runner é isolado).
4. `README.md`, `docs/auth.md` e `docs/email.md`: atualizar as portas citadas.

Aceite da seção: com o starter-template rodando, `pnpm infra:up` e os dois `dev` do Vibru sobem sem conflito.

## 3. Nome do projeto

1. Renomear os pacotes `@starter/*` para `@vibru/*` (package.json, imports, tsconfig, eslint, filtros de scripts). Commit próprio, primeiro da fase.
2. `APP_NAME=Vibru` e `MAIL_FROM=Vibru <no-reply@localhost>` no `.env.example`; título `Vibru` no `layout.tsx` e no shell.
3. `AUTH_REFRESH_TTL_DAYS=90` no `.env.example` (o schema já aceita). O cookie de refresh já usa esse valor como `maxAge`.

## 4. Banco

Migrations: `create_couples`, `create_couple_members`. Ambas com `coreColumns`.

**Enum** `member_color`: `'blue' | 'purple'`.

**`couples`**

| Coluna              | Tipo   | Regras   |
| ------------------- | ------ | -------- |
| `dating_started_on` | `date` | nullable |
| `married_on`        | `date` | nullable |

**`couple_members`**

| Coluna         | Tipo           | Regras                                                |
| -------------- | -------------- | ----------------------------------------------------- |
| `couple_id`    | uuid           | FK `couples.id` on delete cascade, not null, índice   |
| `user_id`      | uuid           | FK `users.id` on delete cascade, not null, **unique** |
| `display_name` | text           | not null (1–40)                                       |
| `color`        | `member_color` | not null; **unique (`couple_id`, `color`)**           |

Colunas `date` são lidas e escritas como string `YYYY-MM-DD` (`mode: 'string'` no Drizzle), nunca como `Date`.

## 5. Contratos (`packages/shared/src/couple/`)

**Funções puras** (com teste unitário):

| Função                                     | Regra                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `todayInSaoPaulo(now: Date): CalendarDate` | Data civil em `America/Sao_Paulo` via `Intl`, sem biblioteca                       |
| `daysBetween(from, to): number`            | Diferença em dias civis, sem fuso                                                  |
| `elapsedParts(from, today)`                | `{ years, months, days, totalDays }`                                               |
| `nextAnnualOccurrence(date, today)`        | Próxima ocorrência (hoje conta como próxima). 29/02 vira 28/02 em ano não bissexto |
| `bodasName(years): string \| null`         | Tabela tradicional brasileira de 1 a 60 anos, em `bodas.ts`                        |

Testes mínimos: virada de dia perto da meia-noite em SP (23:30 em SP = dia anterior em UTC+0); 29/02 em ano bissexto e não bissexto; aniversário hoje (0 dias); bodas 1 (papel), 3 (couro), 25 (prata), 50 (ouro), 61 (`null`).

**Schemas**

| Export                        | Definição                                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calendarDateSchema`          | string `YYYY-MM-DD` que é uma data válida                                                                                                                                                                                                                                                     |
| `memberColorSchema`           | `z.enum(['blue', 'purple'])`                                                                                                                                                                                                                                                                  |
| `coupleMemberSchema`          | `{ id, displayName, color, isMe: boolean }`                                                                                                                                                                                                                                                   |
| `coupleResponseSchema`        | `{ id, datingStartedOn: date \| null, marriedOn: date \| null, today: date, members: coupleMember[], married: { years, months, days, totalDays } \| null, nextWeddingAnniversary: { date, years, bodasName, daysUntil } \| null, nextDatingAnniversary: { date, years, daysUntil } \| null }` |
| `updateCoupleRequestSchema`   | `{ datingStartedOn?: date \| null, marriedOn?: date \| null }`, ao menos um campo                                                                                                                                                                                                             |
| `updateMyMemberRequestSchema` | `{ displayName: string 1–40, trim }`                                                                                                                                                                                                                                                          |

**Códigos de erro** (`COUPLE_ERROR_CODES`):

| `code`                 | HTTP | Quando                                                                             |
| ---------------------- | ---- | ---------------------------------------------------------------------------------- |
| `COUPLE_REQUIRED`      | 403  | Usuário autenticado sem `couple_members`                                           |
| `COUPLE_DATES_INVALID` | 400  | Data no futuro, ou casamento antes do início do namoro (erro no campo `marriedOn`) |

## 6. API (`apps/api/src/modules/couple/`)

1. **`CoupleMemberGuard`** + decorator `@RequiresCouple()` (aplicado no controller) e `@CurrentMember()` → `{ memberId, coupleId, color }`. Sem vínculo: 403 `COUPLE_REQUIRED`. É o padrão que todo módulo de domínio das próximas fases usa.
2. Repositórios de domínio recebem `coupleId` como parâmetro obrigatório. Nenhum método busca sem ele.
3. Os cálculos de `coupleResponse` usam as funções do `shared`, com `today = todayInSaoPaulo(new Date())`.

| Método e rota              | Acesso | Corpo                   | Sucesso              |
| -------------------------- | ------ | ----------------------- | -------------------- |
| `GET /couple`              | membro | —                       | 200 `coupleResponse` |
| `PATCH /couple`            | membro | `updateCoupleRequest`   | 200 `coupleResponse` |
| `PATCH /couple/members/me` | membro | `updateMyMemberRequest` | 200 `coupleResponse` |

`PATCH /couple` valida com os valores combinados (o que veio + o que já estava salvo).

**Seed** (`admin.seed.ts` estendido, idempotente):

| Variável (opcional no `env.schema.ts`; o seed falha com mensagem clara se faltar uma obrigatória) | Uso                                     |
| ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ADMIN_DISPLAY_NAME` (obrigatória no seed)                                                        | Nome do Bruno no casal                  |
| `PARTNER_EMAIL` (obrigatória no seed)                                                             | Login dela                              |
| `PARTNER_DISPLAY_NAME` (obrigatória no seed)                                                      | Nome dela no casal                      |
| `PARTNER_INITIAL_PASSWORD`                                                                        | Mesma regra do `ADMIN_INITIAL_PASSWORD` |
| `COUPLE_DATING_STARTED_ON`, `COUPLE_MARRIED_ON`                                                   | Datas-base iniciais (`YYYY-MM-DD`)      |

Regras: admin = `blue`, role `admin`; parceira = `purple`, role `user`, `email_verified_at` preenchido, mesma regra de senha do admin (dev `Admin@12345` sem troca obrigatória; prod aleatória exibida uma vez, com troca obrigatória). Cria o casal e os 2 vínculos se não existirem. Não sobrescreve nome, senha nem datas já gravados. `registration_enabled` nasce `false` em todos os ambientes, inclusive dev. Todas as chaves novas entram no `.env.example`.

## 7. Web

**Tokens e fontes**

1. `globals.css` recebe os valores da tabela da seção 6 do ADR 0003 (claro em `:root`, noite em `.dark`), mapeados para as variáveis do shadcn (`background`, `card`, `border`, `foreground`, `muted-foreground`, `primary`, `primary-foreground`) e para as novas `sand`, `sand-foreground`, `blue-tile`, `blue-on-tile`, `blue-strong`, `purple-tile`, `purple-on-tile`, `purple-strong`, todas expostas em `@theme inline`. `--radius: 1.5rem`.
2. Fontes por `next/font/google` no `layout.tsx`: Nunito (`--font-sans`, texto) e Bricolage Grotesque (`--font-display`, títulos e números).
3. `features/couple/lib/member-color.ts`: único lugar que traduz `blue`/`purple` em classes de token (tile, on-tile, strong). Nenhum componente usa nome de pessoa para escolher cor.
4. `DESIGN.md`: trocar o princípio "Genérico e fácil de trocar" por uma seção "Identidade Vibru" com os tokens semânticos, a regra de 3 tons por pessoa e a regra do bento (ADR 0003, 6.6).

**Shell (`app-shell.client.tsx` reescrito)**

| Largura | Navegação                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base    | Barra inferior flutuante (cantos arredondados, `safe-bottom`) com 5 abas: Início `/app`, Tarefas `/app/tasks`, Listas `/app/lists`, Agenda `/app/agenda`, Desejos `/app/wishes`. Ícone + rótulo, alvo ≥ 44px, aba ativa em `primary` |
| `md+`   | Barra lateral com as mesmas 5 abas                                                                                                                                                                                                   |

No topo: avatares do casal (inicial do `displayName` na cor de cada membro) abrindo um `DropdownMenu` com: Configurações do casal (`/app/couple`), Perfil, Usuários e Configurações (só admin), Tema e Sair. Usuário sem casal (403 `COUPLE_REQUIRED`) vê uma tela de erro "Sua conta não está ligada a um casal" com botão Sair.

**Rotas**

| Rota                                                     | Conteúdo                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                                                      | `redirect('/app')` em server component (o middleware já manda para `/login` sem cookie). A landing sai      |
| `/app`                                                   | Home em bento (abaixo)                                                                                      |
| `/app/tasks`, `/app/lists`, `/app/agenda`, `/app/wishes` | Estado vazio "Chega numa próxima fase", com título da seção. Cada fase seguinte substitui o seu             |
| `/app/couple`                                            | Formulário: meu nome no casal; início do namoro; data do casamento. Erro da API no campo (helper existente) |

**Home em bento (F1)**: grade de 2 colunas no mobile e 4 em `lg`, `gap` de 8px, blocos com cantos de 24–28px.

| Bloco                 | Tamanho          | Cor              | Conteúdo                                                                     | Sem dado                                              |
| --------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Casados há            | 2 col × 2 linhas | `primary`        | `totalDays` em fonte display, "dias", e "X anos, Y meses e Z dias · desde …" | Vira bloco "Defina as datas do casal" → `/app/couple` |
| Membro azul / roxo    | 1 × 1 cada       | tile do membro   | Nome do membro. Contagem de tarefas fica para a F2 (por ora, só o nome)      | —                                                     |
| Próximas bodas        | 1 × 1            | `sand`           | Nome das bodas, anos e "em N dias" ("hoje!" quando 0)                        | Não aparece                                           |
| Aniversário de namoro | 1 × 1            | `card` com borda | Anos e "em N dias"                                                           | Não aparece                                           |

Saudação no topo: "Oi, {displayName}" e a data de hoje por extenso. Loading em skeleton, erro com retry (padrões do `DESIGN.md`).

**PWA**

1. `app/manifest.ts`: `name` e `short_name` "Vibru", `start_url: '/app'`, `display: 'standalone'`, `background_color` e `theme_color` do tema claro.
2. Ícones por `next/og` (`ImageResponse`): `app/icon.tsx` com `generateImageMetadata` para 192 e 512, e `app/apple-icon.tsx` (180). Desenho: quadrado de cantos arredondados em `#3B2F5C` com dois círculos sobrepostos (azul e roxo fortes). O manifest referencia os ícones gerados.
3. `viewport.themeColor` com uma cor por esquema (claro `#F8F3EE`, escuro `#1C1820`); `metadata.appleWebApp` com `capable: true` e título "Vibru".

## 8. Casos de uso (aceite da API)

Arquivo `test/casal.int-spec.ts`, mais o helper de cenário `createCouple({ datingStartedOn, marriedOn })`, que devolve os dois membros já logáveis.

| Caso de uso                                        | Esperado                                                      |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Usuário sem casal consulta o casal                 | 403 `COUPLE_REQUIRED`                                         |
| Membro consulta o casal                            | 200 com os 2 membros, cores distintas e `isMe` só no próprio  |
| Membro muda a data do casamento                    | `married` e `nextWeddingAnniversary` recalculados na resposta |
| Membro informa casamento antes do início do namoro | 400 `COUPLE_DATES_INVALID`, erro em `marriedOn`               |
| Membro informa data no futuro                      | 400 `COUPLE_DATES_INVALID`                                    |
| Membro muda o próprio nome no casal                | O outro membro vê o nome novo ao consultar o casal            |
| Visitante tenta se cadastrar depois do seed        | 403 (cadastro desligado)                                      |

Garantia técnica: rodar o seed duas vezes resulta em 1 casal, 2 membros e nenhuma senha sobrescrita.

**E2E** (`apps/web/e2e/`, substitui o `admin-smoke`): login do admin → home mostra o bloco "Casados há" → toca na aba Tarefas e vê o estado vazio → abre o menu dos avatares → Configurações do casal → altera o nome e salva. Em 390×844, sem scroll horizontal em nenhuma das telas visitadas.

## 9. Entregas (ordem fixa, um commit cada)

1. `chore: rename packages to @vibru` (seção 3.1)
2. `chore: move dev ports to run alongside starter-template` (seção 2)
3. `chore: vibru app name and 90-day session` (seções 3.2 e 3.3)
4. `feat(shared): calendar date and bodas helpers` (seção 5, funções + testes)
5. `feat(api): couples, members and couple guard` (seções 4, 5 schemas, 6, casos de uso)
6. `feat(api): seed couple` (seção 6, seed + garantia técnica)
7. `feat(web): vibru tokens, fonts and design doc` (seção 7, tokens e fontes)
8. `feat(web): shell with bottom nav and section placeholders` (shell, rotas, `/` → `/app`)
9. `feat(web): couple settings and bento home` (`/app/couple`, home)
10. `feat(web): pwa manifest and icons`
11. `test(e2e): vibru smoke` (seção 8, E2E)

## 10. Fora de escopo

Tarefas, listas, agenda, ICS, desejos, presentes e `og:image` (F2 a F6) · deploy · Web Push · service worker · remover convite, e-mail, gestão de usuários ou CPF (ADR 0003, seção 5) · mexer nas specs antigas do template em `docs/specs/`.

## 11. Aceite final

- [ ] Gate da seção 0.3 verde e CI verde
- [ ] Vibru e starter-template sobem lado a lado na mesma máquina
- [ ] Nenhum `@starter/` restante no código (`git grep @starter/ -- ':!docs'` vazio)
- [ ] Casos de uso e garantia técnica da seção 8 passando, com o texto do caso no `it`
- [ ] Home, navegação e `/app/couple` corretas em claro e escuro, em 390px e em `lg`
- [ ] App instalável ("Adicionar à tela inicial") mostrando nome e ícone do Vibru
- [ ] PR com checklist e seção "Decisões" preenchidos
