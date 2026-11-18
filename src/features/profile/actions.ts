'use server';

import { z } from 'zod';
import { ActionFailure, defineAction } from '@/lib/define-action';
import {
  buildProfileResponse,
  buildProfileUpdates,
  type ProfileResponse,
} from './profile-response';
import {
  findProfileByUserId,
  findUserDisplayName,
  isCpfUsedByAnotherUser,
  upsertProfile,
} from './profile-repository';
import { updateProfileSchema } from './schemas';

async function loadProfile(userId: string): Promise<ProfileResponse> {
  const row = await findProfileByUserId(userId);
  if (!row) throw new ActionFailure('failed', 'Usuário não encontrado.');
  return buildProfileResponse(row);
}

export const getProfileAction = defineAction({
  schema: z.undefined(),
  handler: ({ userId }) => loadProfile(userId),
});

export const updateProfileAction = defineAction({
  schema: updateProfileSchema,
  handler: async ({ input, userId }) => {
    if (input.cpf !== undefined && (await isCpfUsedByAnotherUser(input.cpf, userId))) {
      throw new ActionFailure('invalid_input', 'CPF já cadastrado', 'cpf');
    }

    await upsertProfile(userId, buildProfileUpdates(input), await findUserDisplayName(userId));
    return loadProfile(userId);
  },
});
