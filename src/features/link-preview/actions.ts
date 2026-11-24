'use server';

import { z } from 'zod';
import { defineMemberAction } from '@/lib/define-member-action';
import { findLinkPreview, type LinkPreview } from './og-image-service';

const previewSchema = z.object({ url: z.url() });

/** Só para quem está logado e no casal: o servidor visita a URL informada. */
export const previewLinkAction = defineMemberAction({
  schema: previewSchema,
  handler: async ({ input }): Promise<LinkPreview> => findLinkPreview(input.url),
});
