# Testes

Vitest 5 com jsdom. Sem banco de teste, sem testes de integração e sem E2E (ADR 0005): o app é de duas pessoas e a rede de segurança é feita de camadas baratas.

## O que existe

| Camada                       | Como se testa                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Regra pura                   | Teste unitário direto, com datas e valores reais (recorrência, calendário, estoque, bodas, ICS) |
| Mapeadores e privacidade     | Teste unitário (ex.: o dono nunca recebe os campos de reserva)                                  |
| Action                       | Repositórios, sessão e banco simulados com `vi.mock`; a action roda de verdade                  |
| Wrappers (`define*Action`)   | Sessão, vínculo ao casal, zod, falha esperada e falha inesperada                                |
| Rota (`/api/ics/[feedFile]`) | Chama `GET` com o serviço simulado: cabeçalhos e o mesmo 404                                    |
| Tipos, lint, build           | `pnpm typecheck`, `pnpm lint`, `pnpm build` (o build também roda sem variáveis de ambiente)     |

## Como escrever

1. Regra de negócio entra primeiro como função pura com teste que falha antes (RED), depois a implementação.
2. Em spec de action, simule o repositório e afirme **o que foi passado a ele** (`coupleId` do membro, id, escopo), não só o retorno: é isso que prova o isolamento entre casais.
3. Para transação, simule `getDatabase().transaction` chamando o callback com um marcador (`{ tx: true }`) e afirme que a chamada recebeu o mesmo marcador.
4. Nome do teste descreve o comportamento em português.

## O que não é coberto

O SQL dos repositórios (filtros condicionais, ordenação, subselects) não tem teste automático, porque não há banco de teste. Ele é conferido por revisão e pela passada manual no navegador contra o banco de desenvolvimento antes de cada merge.

## Passada manual

Cada PR de domínio lista o que conferir no navegador (criar, editar, excluir, o caso de borda do domínio). É a única verificação do SQL real.
