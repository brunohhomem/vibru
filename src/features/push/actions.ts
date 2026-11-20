'use server';

import { defineMemberAction } from '@/lib/define-member-action';
import { z } from 'zod';
import {
  deletePushSubscription,
  findNotificationPreferences,
  upsertNotificationPreferences,
  upsertPushSubscription,
} from './push-repository';
import { updatePreferencesSchema } from './push-preferences';
import { subscribePushSchema, unsubscribePushSchema } from './push-schemas';

export const subscribePushAction = defineMemberAction({
  schema: subscribePushSchema,
  handler: async ({ input, userId }) => {
    await upsertPushSubscription(userId, input);
  },
});

export const getPreferencesAction = defineMemberAction({
  schema: z.undefined(),
  handler: ({ userId }) => findNotificationPreferences(userId),
});

export const updatePreferencesAction = defineMemberAction({
  schema: updatePreferencesSchema,
  handler: async ({ input, userId }) => {
    await upsertNotificationPreferences(userId, input);
    return findNotificationPreferences(userId);
  },
});

export const unsubscribePushAction = defineMemberAction({
  schema: unsubscribePushSchema,
  handler: async ({ input, userId }) => {
    await deletePushSubscription(userId, input.endpoint);
  },
});
