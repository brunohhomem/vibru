'use server';

import { defineMemberAction } from '@/lib/define-member-action';
import { deletePushSubscription, upsertPushSubscription } from './push-repository';
import { subscribePushSchema, unsubscribePushSchema } from './push-schemas';

export const subscribePushAction = defineMemberAction({
  schema: subscribePushSchema,
  handler: async ({ input, userId }) => {
    await upsertPushSubscription(userId, input);
  },
});

export const unsubscribePushAction = defineMemberAction({
  schema: unsubscribePushSchema,
  handler: async ({ input, userId }) => {
    await deletePushSubscription(userId, input.endpoint);
  },
});
