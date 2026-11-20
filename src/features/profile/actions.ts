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
  updateUserImage,
  upsertProfile,
} from './profile-repository';
import { updateAvatarSchema, updateProfileSchema } from './schemas';

async function loadProfile(userId: string): Promise<ProfileResponse> {
  const row = await findProfileByUserId(userId);
  if (!row) throw new ActionFailure('failed', 'Usuário não encontrado.');
  return buildProfileResponse(row);
}

export const getProfileAction = defineAction({
  schema: z.undefined(),
  handler: ({ userId }) => loadProfile(userId),
});

export const updateAvatarAction = defineAction({
  schema: updateAvatarSchema,
  handler: async ({ input, userId }) => {
    await updateUserImage(userId, input.image);
  },
});

export const removeAvatarAction = defineAction({
  schema: z.undefined(),
  handler: async ({ userId }) => {
    await updateUserImage(userId, null);
  },
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
