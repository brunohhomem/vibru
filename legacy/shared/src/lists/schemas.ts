import { z } from '../zod';

export const listTitleSchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe o nome da lista' })
  .max(60, { message: 'Use até 60 caracteres' });

export const listItemTitleSchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe o item' })
  .max(200, { message: 'Use até 200 caracteres' });

export const listItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  checkedAt: z.string().nullable(),
  checkedByMemberId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const listResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  items: z.array(listItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  totalItems: z.number().int().nonnegative(),
  checkedItems: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const listsResponseSchema = z.object({
  lists: z.array(listSummarySchema),
});

export const createListRequestSchema = z.object({
  title: listTitleSchema,
});

export const updateListRequestSchema = z.object({
  title: listTitleSchema,
});

export const createListItemRequestSchema = z.object({
  title: listItemTitleSchema,
});

export const updateListItemRequestSchema = z.object({
  title: listItemTitleSchema,
});

export const LIST_ERROR_CODES = {
  LIST_NOT_FOUND: 'LIST_NOT_FOUND',
  LIST_ITEM_NOT_FOUND: 'LIST_ITEM_NOT_FOUND',
} as const;

export type ListItem = z.infer<typeof listItemSchema>;
export type List = z.infer<typeof listResponseSchema>;
export type ListSummary = z.infer<typeof listSummarySchema>;
export type ListsResponse = z.infer<typeof listsResponseSchema>;
export type CreateListRequest = z.infer<typeof createListRequestSchema>;
export type UpdateListRequest = z.infer<typeof updateListRequestSchema>;
export type CreateListItemRequest = z.infer<typeof createListItemRequestSchema>;
export type UpdateListItemRequest = z.infer<typeof updateListItemRequestSchema>;
export type ListErrorCode = (typeof LIST_ERROR_CODES)[keyof typeof LIST_ERROR_CODES];
