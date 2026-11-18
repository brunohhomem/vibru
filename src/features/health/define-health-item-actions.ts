import { z } from 'zod';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import type { HealthItemRepository } from './health-item-repositories';
import { isUuid, ITEM_NOT_FOUND_MESSAGE, requireCoupleMember } from './health-member-access';

type Scope = { coupleId: string; memberId: string };

type HealthItemConfig<Row, NewRow, Item, CreateInput, UpdateInput> = {
  repository: HealthItemRepository<Row, NewRow>;
  createSchema: z.ZodType<CreateInput>;
  updateSchema: z.ZodType<UpdateInput>;
  toItem: (row: Row) => Item;
  toNewRow: (data: CreateInput, scope: Scope) => NewRow;
  toChanges: (data: UpdateInput) => Partial<NewRow>;
  /** Conferência extra antes de gravar (ex.: o médico do evento é da ficha do mesmo membro). */
  beforeWrite?: (scope: Scope, data: CreateInput | UpdateInput) => Promise<void>;
};

/**
 * Criar, editar e excluir um tipo de item da ficha. Os cinco tipos (alergias,
 * condições, contatos, médicos e histórico) seguem o mesmo contrato: o membro precisa
 * ser do casal e o item precisa ser da ficha dele.
 */
export function defineHealthItemActions<Row, NewRow, Item, CreateInput, UpdateInput>(
  config: HealthItemConfig<Row, NewRow, Item, CreateInput, UpdateInput>,
) {
  const { repository } = config;

  async function requireItem(scope: Scope, itemId: string): Promise<void> {
    const row = isUuid(itemId)
      ? await repository.findActive(scope.coupleId, scope.memberId, itemId)
      : null;
    if (!row) throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
  }

  return {
    create: defineMemberAction({
      schema: z.object({ memberId: z.string(), data: config.createSchema }),
      handler: async ({ input, member }): Promise<Item> => {
        await requireCoupleMember(member.coupleId, input.memberId);
        const scope = { coupleId: member.coupleId, memberId: input.memberId };
        await config.beforeWrite?.(scope, input.data);

        const row = await repository.insert(config.toNewRow(input.data, scope));
        return config.toItem(row);
      },
    }),
    update: defineMemberAction({
      schema: z.object({ memberId: z.string(), itemId: z.string(), data: config.updateSchema }),
      handler: async ({ input, member }): Promise<Item> => {
        await requireCoupleMember(member.coupleId, input.memberId);
        const scope = { coupleId: member.coupleId, memberId: input.memberId };
        await requireItem(scope, input.itemId);
        await config.beforeWrite?.(scope, input.data);

        const row = await repository.update(
          scope.coupleId,
          scope.memberId,
          input.itemId,
          config.toChanges(input.data),
        );
        return config.toItem(row);
      },
    }),
    remove: defineMemberAction({
      schema: z.object({ memberId: z.string(), itemId: z.string() }),
      handler: async ({ input, member }): Promise<null> => {
        await requireCoupleMember(member.coupleId, input.memberId);
        const scope = { coupleId: member.coupleId, memberId: input.memberId };
        await requireItem(scope, input.itemId);

        const deleted = await repository.softDelete(scope.coupleId, scope.memberId, input.itemId);
        if (!deleted) throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
        return null;
      },
    }),
  };
}
