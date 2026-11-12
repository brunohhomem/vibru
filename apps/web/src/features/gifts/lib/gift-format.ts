import type { GiftCategory, GiftForPartner, GiftResponse } from '@vibru/shared';

export function giftCategoryLabel(category: GiftCategory): string {
  switch (category) {
    case 'clothing':
      return 'Roupa';
    case 'accessory':
      return 'Acessório';
    case 'other':
      return 'Outro';
  }
}

/** A API só manda os campos de reserva para quem não é o dono da lista. */
export function hasReservationFields(gift: GiftResponse): gift is GiftForPartner {
  return 'reservedByMemberId' in gift;
}
