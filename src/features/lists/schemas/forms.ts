import { z } from '@vibru/shared/zod';
import { listItemTitleSchema, listTitleSchema } from '@vibru/shared';

export const listTitleFormSchema = z.object({ title: listTitleSchema });
export const listItemFormSchema = z.object({ title: listItemTitleSchema });

export type ListTitleFormValues = z.infer<typeof listTitleFormSchema>;
export type ListItemFormValues = z.infer<typeof listItemFormSchema>;
