# Vibru em um app Next.js único: design

Data: 2026-11-18. Status: aprovado em 2026-11-18.

## Intenção

O vibru é um app pessoal para 2 pessoas (o casal). Hoje roda como monorepo pnpm com API NestJS, Redis, worker BullMQ e envio de e-mail, o que é estrutura demais para esse uso. A intenção é ter **um único app Next.js** em que toda a lógica de servidor é server action, o cache e as mutações no cliente usam TanStack Query, e a infraestrutura se resume a um Postgres. Quanto menos estrutura e código, melhor.

## Metas

- Um só app Next.js na raiz do repositório. Sem `apps/`, sem `packages/`, sem turbo.
- Sem Redis, sem BullMQ, sem worker, sem e-mail (nem Mailpit, nem templates, nem SMTP).
- Server actions substituem os controllers HTTP. Só o Postgres (Drizzle) como infra.
- Auth com Better Auth (e-mail e senha, sessão em cookie, sem plugins e sem papéis).
- Mesmo comportamento funcional de hoje para o usuário: tarefas, listas, saúde, agenda, casal, presentes, desejos, medicações, perfil, home em bento, link-preview.
- Testes e CI continuam como rede de segurança, portados para o novo formato.

## Não-metas

- Preservar dados: não há dados a manter. O banco é recriado do zero.
- Cadastro público, convites, confirmação de e-mail e "esqueci a senha" por e-mail: saem.
- Papéis e níveis de acesso (admin e user), administração de usuários, log de auditoria: saem. A única regra de acesso é estar autenticado como um dos 2 usuários.
- Rate limit distribuído, filas, jobs agendados, Swagger, API REST pública: saem.
- Suporte a mais de 2 usuários ou a multi-tenant.

## Anti-metas (seria falha mesmo que "funcione")

- Recriar camadas de controller, service e repository por módulo dentro do Next. A simplificação é o objetivo.
- Server action sem checar a sessão: toda action autenticada valida o usuário antes de qualquer acesso ao banco.
- Dado de fora entrar sem validação zod.

## Restrições

- Regras do `AGENTS.md` continuam: guard clause, sem `any` sem justificativa, `page.tsx` e `layout.tsx` sem `'use client'`, hooks só em `*.client.tsx`, `hooks/` ou `components/ui`, mobile-first, nomes completos, sem `eslint-disable` para satisfazer métrica.
- As regras de camadas de backend (controller não importa drizzle etc.) deixam de existir e são substituídas por uma regra equivalente para o novo formato (ver abaixo).
- Fluxo do `AGENTS.md`: ADR em `docs/adr/` e spec em `docs/specs/` aprovados antes de executar cada fase.
- **Hospedagem na Vercel** (serverless). Por isso: sem processo de longa duração, sem estado em memória entre requisições, sem worker, e conexões ao Postgres precisam funcionar em funções efêmeras (Postgres gerenciado com pooling, ex. Neon/Vercel Postgres; driver e pool escolhidos de acordo).
- Versões atuais: Next 16, React 19, Drizzle, zod 4, TanStack Query 5, Postgres 18.

## Abordagens consideradas

- **A. App único na raiz.** Pasta por feature com `actions.ts`, `queries` e componentes; sem camadas HTTP. Escolhida pelo usuário.
- **B. Migrar no lugar mantendo `apps/web`.** Menor diff, mas mantém a cerimônia do monorepo (turbo, `packages/config`, `shared`). Descartada: contraria o objetivo de simplificar.
- **C. Sessão própria em vez de biblioteca.** Menos dependência, mas código de auth feito à mão. Descartada pelo usuário em favor do Better Auth.

## Decisões do usuário

1. App único (abordagem A), achatando o repositório.
2. Better Auth para autenticação, só com e-mail e senha. Sem plugin de admin e sem papéis.
3. Sem e-mail: sem cadastro, convite, confirmação nem reset por e-mail. Os 2 usuários vêm do seed. Esquecimento de senha se resolve por script de terminal (`pnpm user:reset-password`) ou pelo outro usuário na tela de perfil.
4. Sem dados a preservar: o banco pode ser recriado e o schema alterado à vontade.
5. Hospedagem na Vercel; é o motivo de tudo ficar no Next.
6. Sem papéis, sem administração de usuários e sem log de auditoria. O `/settings` fica (tela e tabela genérica de configurações) como ponto de extensão, mesmo que por ora tenha pouco conteúdo.

## Design

### Estrutura

```
src/
  app/                    rotas (page.tsx e layout.tsx sem 'use client')
  features/<feature>/     actions.ts, schemas.ts, queries.client.ts, components/
  db/                     schema Drizzle, cliente, migrations, seed
  lib/                    auth.ts (Better Auth), env.ts, utilitários
```

Compartilhamento de schema zod entre cliente e servidor passa a ser import normal dentro do mesmo app (some o `packages/shared` e seu build CommonJS).

### Server actions e TanStack Query

- Leitura: server component pode ler direto do banco para a primeira renderização; leituras interativas usam `useQuery` cujo `queryFn` chama uma server action de leitura.
- Escrita: `useMutation` chama server action; ao concluir, invalida as queries afetadas.
- Padrão de action: guard clause de sessão, parse do input com zod, acesso ao Drizzle, retorno tipado. Erros esperados voltam como resultado tipado (não exceção solta). O wrapper comum de action (sessão e validação) é uma função pequena e única.
- Sai o axios, o interceptor de refresh e o `api.ts`.

### Auth (Better Auth)

- Adaptador Drizzle sobre o Postgres. Só e-mail e senha, sem plugins. Sem `role`: os 2 usuários têm o mesmo acesso.
- Tabelas do Better Auth (`user`, `session`, `account`, `verification` se o núcleo exigir) substituem `users`, `sessions` e `email_tokens`. As tabelas de domínio (`people`, couples etc.) passam a referenciar `user.id`. Aceita-se mudar o tipo do id se o Better Auth exigir.
- Sem verificação de e-mail e sem registro aberto (`emailAndPassword` com cadastro desabilitado). Usuários criados pelo seed. `must_change_password` fica como campo extra para forçar a troca da senha inicial no primeiro login, se o comportamento atual for preservado (decisão do construtor).
- Proteção de rotas: o proxy/middleware do Next só faz a checagem barata de cookie para redirecionar ao login; a checagem real fica em cada action e em cada layout protegido.
- Rate limit de login: o embutido do Better Auth, com armazenamento em banco (memória não funciona em serverless).
- Troca de senha própria e redefinição da senha do outro usuário na tela de perfil (qualquer um dos 2 pode, já que não há papéis). `pnpm user:reset-password` é um script de terminal rodado contra a `DATABASE_URL`.

### O que sai

| Sai                                                                                        | Motivo                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `apps/api` inteiro, `packages/shared`, `packages/scripts`, turbo                           | substituídos por `src/` único                                              |
| Redis, BullMQ, worker, `compose` do Redis e do Mailpit                                     | sem fila nem e-mail                                                        |
| Módulos `mail`, `email-tokens`, `maintenance`, invitations, confirmação e reset por e-mail | sem e-mail                                                                 |
| Telas register, accept-invite, confirm-email, forgot-password, reset-password              | idem                                                                       |
| Swagger, throttler Redis, guards, filtros, pipes                                           | HTTP e Redis                                                               |
| Papéis (`role`, guards de papel, `role-access`), `users-admin` e a tela `users`            | sem níveis de acesso                                                       |
| Módulo `audit` e a tabela `audit_logs`                                                     | sem log                                                                    |
| `registration_enabled` e a tela de cadastro                                                | sem cadastro (o `/settings` e `system_settings` ficam)                     |
| Tabelas `email_tokens`, `sessions` antiga, `users` antiga                                  | trocadas pelo Better Auth                                                  |
| Job de limpeza de sessões                                                                  | o Better Auth cuida de expiração                                           |
| Scripts `keys:generate`, `keys:rotate`                                                     | sobra só `BETTER_AUTH_SECRET`; decidir se o script continua valendo a pena |

### O que fica e é portado

- Postgres, Drizzle e migrations (reiniciadas do zero). Seed dos 2 usuários.
- Módulos de domínio: agenda, couple, gifts, health, lists, medications, people, tasks, wishes, settings, link-preview (a proteção contra endereços bloqueados continua e passa a ser uma action ou route handler).
- Frontend atual (telas, componentes, DESIGN.md) praticamente intocado; muda só a camada de dados.

### Testes

- Testes de integração viram testes das server actions contra um Postgres de teste, chamando as funções direto (sem HTTP). A cobertura por assunto atual (tarefas, listas, saúde, casal, desejos, presentes, perfil, sessão, segurança etc.) é preservada, menos o que saiu com o e-mail.
- Smoke E2E (`pnpm e2e`) continua contra o build de produção e é o critério de aceite final.
- Unit de utilitários (`money` etc.) continuam.

### Tooling, CI e docs

- ESLint, Husky, commitlint, Prettier e CI são reduzidos a um único pacote. Uma regra de ESLint equivalente à antiga regra 7: componente (`*.tsx`) não importa `drizzle-orm` nem `src/db` direto; só `actions.ts` e `src/db` falam com o banco.
- Reescrever `AGENTS.md`, `README.md`, `docs/conventions/*` (backend vira "server actions"), `docs/auth.md`; apagar `docs/email.md`; novo ADR registrando a decisão.

### Fases sugeridas

1. ADR e spec; criar o esqueleto Next na raiz com Postgres, Drizzle, Better Auth, login e seed funcionando.
2. Portar domínios em lotes (tarefas, listas, casal e pessoas; saúde e medicações; agenda; presentes e desejos; home, perfil, link-preview), cada um com os testes portados.
3. Remover o que sobrou (`apps/api`, `packages/*`, Redis, e-mail), ajustar CI, docs e smoke E2E.

## Decisões minhas (a confirmar na leitura)

- **Hospedagem:** Vercel (decisão do usuário). Postgres de produção gerenciado com pooling; o compose fica só com o Postgres de desenvolvimento. Migrations e seed rodam de fora da Vercel, manualmente, contra a `DATABASE_URL`. O rate limit do Better Auth usa armazenamento em **banco**, não em memória.
- **Hash de senha:** o padrão do Better Auth (scrypt). Sem dados antigos, não há motivo para manter bcrypt; a dependência `bcrypt` sai.
- **Seed:** cria os 2 usuários a partir de variáveis de ambiente (e-mail e senha inicial de cada um) e é idempotente, como hoje.

## Fica para quem constrói

- Mapeamento exato das colunas Better Auth (sem plugin de admin) e se o id continua `uuid`.
- Nomes e formato do wrapper de action e do resultado tipado de erro.
- Como organizar leitura em server component versus `useQuery` por tela.
- Estratégia do Postgres de teste e do script de reset de senha.
- Ordem fina dos lotes de portabilidade.
