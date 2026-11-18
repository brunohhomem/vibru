import { eq } from 'drizzle-orm';
import { coupleMembers } from '@/db/couple-schema';
import { getDatabase } from '@/db/client';
import type { MemberColor } from '@/features/couple/couple-schemas';

export type MemberContext = { memberId: string; coupleId: string; color: MemberColor };

// Resolve o vínculo do usuário com o casal: padrão de acesso de todas as actions de domínio.
export async function findMemberContextByUserId(userId: string): Promise<MemberContext | null> {
  const [member] = await getDatabase()
    .select({
      memberId: coupleMembers.id,
      coupleId: coupleMembers.coupleId,
      color: coupleMembers.color,
    })
    .from(coupleMembers)
    .where(eq(coupleMembers.userId, userId))
    .limit(1);

  return member ?? null;
}
