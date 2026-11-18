# Frontend

## Servidor e cliente

1. `page.tsx` e `layout.tsx` não levam `'use client'`.
2. O que precisa de `'use client'` fica num `*.client.tsx` pequeno, importado pelo server component.
3. Hook só é chamado em `*.client.tsx`, em `hooks/` ou em `components/ui`. O shadcn, em `components/ui`, pode trazer `'use client'` sem o sufixo `.client`.
4. `error.tsx` e `global-error.tsx` são Client Components por exigência do Next (exceção no ESLint).

## Pastas

Feature em `src/features/<feature>/{components,hooks,lib,schemas}` e os arquivos de domínio na raiz da feature (`actions.ts`, repositório, regras puras, schemas zod do servidor). `schemas/forms.ts` guarda os schemas dos formulários do cliente. Componente shadcn em `src/components/ui`. Layout em `src/components/layout`.

## Dados

- Leitura e escrita são server actions chamadas por hooks do TanStack Query (`unwrapActionResult(await action(...))`). Não há `fetch`/axios para a própria API.
- A query `['me']` é a fonte do estado de autenticação; o `QueryClient` global (`src/lib/query-client.ts`) limpa o cache e recarrega no `/login` quando uma query ou mutation volta `unauthenticated`.
- O shell do `/app` redireciona para `/change-password` enquanto `mustChangePassword` for verdadeiro.
- Erro de mutation: `applyActionError(error, form.setError)` (campo do formulário quando a action aponta um, senão toast).
- Mutations com efeito visível imediato (concluir tarefa, marcar item) usam atualização otimista com retorno ao estado anterior em caso de erro.

## Mobile-first

1. O estilo base é o de mobile. Só se evolui com `min-width` (`sm`, `md`, `lg`). Variante `max-*` não entra.
2. Sidebar vira drawer no mobile; tabela vira lista de cards abaixo de `md`.
3. Campo de formulário com fonte de no mínimo 16px e alvo de toque de no mínimo 44px.
4. Use `dvh` no lugar de `vh` e respeite as safe areas.

Idioma da interface: pt-BR fixo. Formulários usam os schemas zod da própria feature.
