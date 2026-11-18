export const WISH_CATEGORIES = [
  'movie',
  'music',
  'travel',
  'together',
  'date_idea',
  'other',
] as const;

export type WishCategory = (typeof WISH_CATEGORIES)[number];

export const WISH_STATUSES = ['open', 'done'] as const;

export type WishStatus = (typeof WISH_STATUSES)[number];

export const WISH_ERROR_CODES = {
  WISH_NOT_FOUND: 'WISH_NOT_FOUND',
} as const;
