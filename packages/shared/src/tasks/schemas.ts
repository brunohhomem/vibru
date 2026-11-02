import { z } from '../zod';
import { calendarDateSchema } from '../couple/schemas';
import { TASK_CATEGORIES } from './categories';
import { TASK_RECURRENCE_KINDS } from './recurrence';

export const taskRecurrenceSchema = z.enum(TASK_RECURRENCE_KINDS);

export const taskCategorySchema = z.enum(TASK_CATEGORIES);

export const taskDueTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use o formato HH:MM' });

export const taskRecurrenceRuleSchema = z.object({
  kind: taskRecurrenceSchema,
  interval: z.number().int().min(1).max(365),
});

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable(),
  assigneeMemberId: z.string().uuid().nullable(),
  dueOn: calendarDateSchema.nullable(),
  dueTime: taskDueTimeSchema.nullable(),
  category: taskCategorySchema,
  medicationId: z.string().uuid().nullable(),
  recurrence: taskRecurrenceRuleSchema,
  completedAt: z.string().nullable(),
  completedByMemberId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const tasksResponseSchema = z.object({
  today: calendarDateSchema,
  weekStartsOn: calendarDateSchema,
  open: z.array(taskSchema),
  completedThisWeek: z.array(taskSchema),
});

const taskFields = {
  title: z
    .string()
    .trim()
    .min(1, { message: 'Informe o título' })
    .max(200, { message: 'Use até 200 caracteres' }),
  notes: z.string().max(2000, { message: 'Use até 2000 caracteres' }).nullable().optional(),
  assigneeMemberId: z.string().uuid().nullable(),
  dueOn: calendarDateSchema.nullable().optional(),
  dueTime: taskDueTimeSchema.nullable().optional(),
  category: taskCategorySchema.optional(),
  recurrence: taskRecurrenceRuleSchema.optional(),
};

export const taskLowStockSchema = z.object({
  medicationId: z.string().uuid(),
  name: z.string(),
  daysLeft: z.number().int().nonnegative(),
});

export const completeTaskResponseSchema = z.object({
  completed: taskSchema,
  next: taskSchema.nullable(),
  lowStock: taskLowStockSchema.nullable(),
});

export const createTaskRequestSchema = z.object(taskFields).superRefine((data, ctx) => {
  const kind = data.recurrence?.kind ?? 'none';
  if (kind !== 'none' && !data.dueOn) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueOn'],
      message: 'Tarefa recorrente precisa de prazo',
    });
  }
});

export const updateTaskRequestSchema = z
  .object({
    ...taskFields,
    title: taskFields.title.optional(),
    assigneeMemberId: taskFields.assigneeMemberId.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo',
  });

export const TASK_ERROR_CODES = {
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_ASSIGNEE_INVALID: 'TASK_ASSIGNEE_INVALID',
  TASK_RECURRENCE_INVALID: 'TASK_RECURRENCE_INVALID',
  TASK_ALREADY_COMPLETED: 'TASK_ALREADY_COMPLETED',
  TASK_NOT_COMPLETED: 'TASK_NOT_COMPLETED',
  TASK_MEDICATION_LOCKED: 'TASK_MEDICATION_LOCKED',
  TASK_DUE_TIME_INVALID: 'TASK_DUE_TIME_INVALID',
} as const;

export type TaskRecurrence = z.infer<typeof taskRecurrenceSchema>;
export type TaskRecurrenceRule = z.infer<typeof taskRecurrenceRuleSchema>;
export type TaskDueTime = z.infer<typeof taskDueTimeSchema>;
export type TaskLowStock = z.infer<typeof taskLowStockSchema>;
export type CompleteTaskResponse = z.infer<typeof completeTaskResponseSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TasksResponse = z.infer<typeof tasksResponseSchema>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
export type TaskErrorCode = (typeof TASK_ERROR_CODES)[keyof typeof TASK_ERROR_CODES];
