'use server';

import { and, eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { account, session, user } from '@/db/auth-schema';
import { getDatabase } from '@/db/client';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { changePasswordSchema, resetPartnerPasswordSchema } from '@/features/profile/schemas';
import { auth } from '@/lib/auth';
import { ActionFailure, defineAction } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { findPartnerUserId } from './password-rules';

const WRONG_CURRENT_PASSWORD_MESSAGE = 'Senha atual incorreta.';
const CREDENTIAL_PROVIDER_ID = 'credential';

function isWrongPasswordError(error: unknown): boolean {
  return error instanceof APIError && error.body?.code === 'INVALID_PASSWORD';
}

export const changePasswordAction = defineAction({
  schema: changePasswordSchema,
  handler: async ({ input, userId }) => {
    try {
      await auth.api.changePassword({
        headers: await headers(),
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          revokeOtherSessions: true,
        },
      });
    } catch (error) {
      if (isWrongPasswordError(error)) {
        throw new ActionFailure('invalid_input', WRONG_CURRENT_PASSWORD_MESSAGE, 'currentPassword');
      }
      throw error;
    }

    await getDatabase().update(user).set({ mustChangePassword: false }).where(eq(user.id, userId));
    return { mustChangePassword: false as const };
  },
});

export const resetPartnerPasswordAction = defineMemberAction({
  schema: resetPartnerPasswordSchema,
  handler: async ({ input, userId, member }) => {
    const partnerUserId = findPartnerUserId(await findCoupleMembers(member.coupleId), userId);
    if (!partnerUserId) throw new ActionFailure('failed', 'Não há outra pessoa no casal.');

    const { password } = await auth.$context;
    const passwordHash = await password.hash(input.newPassword);

    await getDatabase().transaction(async (transaction) => {
      await transaction
        .update(account)
        .set({ password: passwordHash })
        .where(
          and(eq(account.userId, partnerUserId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)),
        );
      // A senha nova é provisória: a pessoa troca no próximo acesso, e as sessões antigas caem.
      await transaction
        .update(user)
        .set({ mustChangePassword: true })
        .where(eq(user.id, partnerUserId));
      await transaction.delete(session).where(eq(session.userId, partnerUserId));
    });
    return null;
  },
});
