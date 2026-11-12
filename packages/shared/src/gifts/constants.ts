export const GIFT_CATEGORIES = ['clothing', 'accessory', 'other'] as const;

export type GiftCategory = (typeof GIFT_CATEGORIES)[number];

export const GIFT_STATUSES = ['wanted', 'received'] as const;

export type GiftStatus = (typeof GIFT_STATUSES)[number];

export const GIFT_ERROR_CODES = {
  GIFT_NOT_FOUND: 'GIFT_NOT_FOUND',
  GIFT_NOT_OWNER: 'GIFT_NOT_OWNER',
  GIFT_SELF_RESERVATION: 'GIFT_SELF_RESERVATION',
  GIFT_ALREADY_RESERVED: 'GIFT_ALREADY_RESERVED',
} as const;
