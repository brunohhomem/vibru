# Autenticação

Better Auth 1.7 com e-mail e senha, sem plugins e sem papéis. Os 2 usuários vêm do seed; não existe cadastro, convite, confirmação de e-mail nem "esqueci a senha" por e-mail.

## Fluxo

1. **Login** (`loginAction`, `src/features/auth/actions.ts`): monta a requisição para `/api/auth/sign-in/email` e passa pelo roteador do Better Auth (`auth.handler`), repassando o IP do cliente. É assim que o limite de tentativas vale: o rate limit só roda no roteador HTTP, não em `auth.api.*`. Os cookies da resposta são copiados para o `cookies()` da action.
2. **Sessão**: cookie com validade de 90 dias. `proxy.ts` só redireciona `/app` sem cookie para `/login?next=…`; a checagem real é o layout do servidor (`src/app/app/layout.tsx`, via `readSession`).
3. **Logout** (`logoutAction`): revoga a sessão e o cliente limpa o cache do TanStack Query.
4. **Sessão expirada no meio do uso**: qualquer query ou mutation que volte `unauthenticated` limpa o cache e recarrega no `/login` (`src/lib/query-client.ts`).

## Limite de tentativas

`/sign-in/email`: 5 por 60 s por IP (regra própria); demais rotas do Better Auth: 100 por 60 s. O contador fica no banco (tabela `rate_limit`, chave única). O IP vem de `x-vercel-forwarded-for` ou `x-forwarded-for`, que a Vercel sobrescreve com o IP real do cliente. Resposta 429 vira a mensagem "Muitas tentativas. Aguarde um minuto e tente de novo."

## Senha

- Regras (`src/features/profile/schemas.ts`): 10 a 72 bytes, ao menos uma letra e um dígito. Hash padrão do Better Auth (scrypt).
- **Troca da própria senha** (`changePasswordAction`): pede a senha atual (erro no campo `currentPassword`), derruba as outras sessões e limpa `mustChangePassword`.
- **Redefinir a senha do outro** (`resetPartnerPasswordAction`, na tela de perfil): pede a **sua** senha atual, grava a nova como provisória, marca `mustChangePassword` no outro e derruba as sessões dele. Sem e-mail, é assim que se resolve um esquecimento.
- **`mustChangePassword`**: no próximo acesso o shell do `/app` redireciona para `/change-password` até a troca.

## Seed

`pnpm db:seed` lê `SEED_USER_ONE_*` e `SEED_USER_TWO_*` (e `COUPLE_*`), grava os usuários direto no banco usando o hash de senha do Better Auth, cria o casal e liga os dois (cores `blue` e `purple`). É idempotente: rodar de novo nunca troca a senha de quem já existe.

## Ids e ambiente

Ids do Better Auth são `text`; os das tabelas de domínio são `uuid` (v7). Em produção na Vercel o `BETTER_AUTH_URL` precisa ser `https` (a validação de ambiente recusa o contrário).
