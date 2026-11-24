import type { GiftCategory } from '@/features/gifts/gift-constants';
import type { GiftForPartner, GiftResponse } from '@/features/gifts/gift-schemas';

const CATEGORY_LABELS: Record<GiftCategory, string> = {
  clothing: 'Roupa',
  accessory: 'Acessório',
  electronics: 'Eletrônicos',
  gym: 'Academia',
  setup: 'Setup',
  romantic: 'Romântico',
  home: 'Casa',
  beauty: 'Beleza',
  experience: 'Experiência',
  other: 'Outro',
};

export function giftCategoryLabel(category: GiftCategory): string {
  return CATEGORY_LABELS[category];
}

/** A API só manda os campos de reserva para quem não é o dono da lista. */
export function hasReservationFields(gift: GiftResponse): gift is GiftForPartner {
  return 'reservedByMemberId' in gift;
}
