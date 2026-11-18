'use server';

import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { user } from '@/db/auth-schema';
import { getDatabase } from '@/db/client';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { changePasswordSchema, resetPartnerPasswordSchema } from '@/features/profile/schemas';
import { auth } from '@/lib/auth';
import { ActionFailure, defineAction } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { findCredentialHash, replacePartnerCredentials } from './credential-repository';
import { findPartnerUserId } from './password-rules';

const WRONG_CURRENT_PASSWORD_MESSAGE = 'Senha atual incorreta.';

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

    // Assumir a conta do outro exige provar quem está do lado de cá: uma sessão roubada não basta.
    const { password } = await auth.$context;
    const ownHash = await findCredentialHash(userId);
    const isOwnPasswordCorrect =
      ownHash !== null &&
      (await password.verify({ hash: ownHash, password: input.currentPassword }));
    if (!isOwnPasswordCorrect) {
      throw new ActionFailure('invalid_input', WRONG_CURRENT_PASSWORD_MESSAGE, 'currentPassword');
    }

    await replacePartnerCredentials(partnerUserId, await password.hash(input.newPassword));
    return null;
  },
});
