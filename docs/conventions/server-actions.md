# Server actions

Não há API separada (ADR 0005). Cada domínio mora em `src/features/<feature>/` e é feito de quatro peças.

## Peças

1. **Regra pura** (`*-rules.ts`, `*-entries.ts`, `*-mappers.ts`): sem banco, sem sessão, com teste unitário. Datas, agrupamentos, recorrência, estoque, privacidade da reserva e mapeamento de linha para resposta vivem aqui.
2. **Repositório** (`*-repository.ts`): só ele fala com o Drizzle. Funções, não classes. Todo método recebe `coupleId` (itens da ficha de saúde também `memberId`; presentes também o dono da lista). A exclusão é lógica (`is_active = false`). Quem precisa de transação recebe um `DatabaseExecutor` (o banco ou a transação).
3. **Action** (`actions.ts`, com `'use server'`): fina. Lê o repositório, chama a regra pura e grava. Só exporta funções assíncronas.
4. **Hook** (`hooks/use-*.ts`): TanStack Query sobre `unwrapActionResult(await action(...))`.

## defineAction e defineMemberAction

`src/lib/define-action.ts` e `src/lib/define-member-action.ts` são o único ponto de entrada:

- Validam a sessão antes de qualquer acesso ao banco (`unauthenticated`).
- `defineMemberAction` também resolve o vínculo ao casal (`couple_required`).
- Validam o dado de fora com zod (`invalid_input`). O resultado aponta o campo do primeiro erro (`field`); um invólucro `data` no caminho é transparente. A mensagem do schema só vale quando é de uma regra própria (`custom`); mensagens padrão do zod nunca chegam ao usuário.
- Falha esperada vira `ActionFailure(code, message, field?)`; qualquer outra vira "failed" sem vazar a mensagem interna.

O resultado é `ActionResult<T>`. No cliente, `unwrapActionResult` o transforma em exceção (`ActionResultError`) para o TanStack Query, e `applyActionError` mostra a falha: no campo do formulário quando há `field`, senão em toast.

## Isolamento

- Todo acesso é escopado por `coupleId` do membro da sessão. Nunca confie num id de casal vindo do cliente.
- Id malformado, de outro casal ou removido responde igual ("Item não encontrado"), sem revelar existência.
- Dado sensível não aparece em mensagem de erro (saúde) nem na resposta de quem não deve ver (reserva de presente: o dono nem recebe os campos).

## Concorrência

Quando duas ações simultâneas não podem ambas valer (concluir tarefa, reservar presente, marcar item, reabrir tarefa), o `UPDATE` é condicional (`WHERE completed_at IS NULL`, `reserved_by_member_id IS NULL`, …) e a segunda ação não encontra a linha. A action trata isso como conflito ou devolve o estado atual (idempotência).

## Rotas que não são actions

- `src/app/api/auth/[...all]`: roteador do Better Auth.
- `src/app/api/ics/[feedFile]`: feed de calendário público; a credencial é o token da URL (só o hash fica no banco), e feed inexistente, revogado ou malformado respondem o mesmo 404 com `no-store`.
