import type { CoupleMemberRow } from '@/db/couple-schema';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { ActionFailure } from '@/lib/define-action';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// As mensagens de erro nunca repetem dado de saúde.
export const MEMBER_NOT_FOUND_MESSAGE = 'Pessoa não encontrada';
export const ITEM_NOT_FOUND_MESSAGE = 'Item não encontrado';
export const MEDICATION_NOT_FOUND_MESSAGE = 'Remédio não encontrado';

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Garante que a ficha pedida pertence a um membro do mesmo casal. Membro de outro
 * casal e id malformado respondem igual, sem revelar existência.
 */
export async function requireCoupleMember(
  coupleId: string,
  memberId: string,
): Promise<CoupleMemberRow> {
  const member = isUuid(memberId)
    ? (await findCoupleMembers(coupleId)).find((candidate) => candidate.id === memberId)
    : undefined;
  if (!member) throw new ActionFailure('failed', MEMBER_NOT_FOUND_MESSAGE);
  return member;
}
