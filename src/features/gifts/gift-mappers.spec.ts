import { describe, expect, it } from 'vitest';
import type { GiftRow } from '@/db/gifts-schema';
import { toGiftResponse } from './gift-mappers';

function giftRow(overrides: Partial<GiftRow> = {}): GiftRow {
  return {
    id: 'gift-1',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    coupleId: 'couple-1',
    ownerMemberId: 'owner',
    title: 'Relógio',
    category: 'accessory',
    url: null,
    imageUrl: null,
    priceCents: 29900,
    notes: null,
    reservedByMemberId: 'partner',
    reservedAt: new Date('2026-10-02T10:00:00.000Z'),
    receivedAt: null,
    ...overrides,
  };
}

describe('toGiftResponse', () => {
  it('para o dono, os campos de reserva nem existem no objeto', () => {
    const response = toGiftResponse(giftRow(), 'owner');

    expect(response).not.toHaveProperty('reservedByMemberId');
    expect(response).not.toHaveProperty('reservedAt');
    expect(JSON.stringify(response)).not.toContain('partner');
    expect(response).toMatchObject({ id: 'gift-1', title: 'Relógio', priceCents: 29900 });
  });

  it('para quem não é o dono, mostra quem reservou e quando', () => {
    expect(toGiftResponse(giftRow(), 'partner')).toMatchObject({
      reservedByMemberId: 'partner',
      reservedAt: '2026-10-02T10:00:00.000Z',
    });
  });

  it('presente sem reserva mostra nulos para o parceiro', () => {
    expect(
      toGiftResponse(giftRow({ reservedByMemberId: null, reservedAt: null }), 'partner'),
    ).toMatchObject({ reservedByMemberId: null, reservedAt: null });
  });

  it('datas saem em ISO', () => {
    expect(
      toGiftResponse(giftRow({ receivedAt: new Date('2026-10-05T10:00:00.000Z') }), 'owner'),
    ).toMatchObject({
      receivedAt: '2026-10-05T10:00:00.000Z',
      createdAt: '2026-10-01T10:00:00.000Z',
    });
  });
});
