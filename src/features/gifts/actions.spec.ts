import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findCoupleMembers: vi.fn(),
  findOgImageUrl: vi.fn(),
  listGiftsByStatus: vi.fn(),
  findActiveGift: vi.fn(),
  insertGift: vi.fn(),
  updateGift: vi.fn(),
  reserveGift: vi.fn(),
  releaseGift: vi.fn(),
  softDeleteGift: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/couple/couple-repository', () => ({
  findCoupleMembers: mocks.findCoupleMembers,
}));
vi.mock('@/features/link-preview/og-image-service', () => ({
  findOgImageUrl: mocks.findOgImageUrl,
}));
vi.mock('./gifts-repository', () => ({
  listGiftsByStatus: mocks.listGiftsByStatus,
  findActiveGift: mocks.findActiveGift,
  insertGift: mocks.insertGift,
  updateGift: mocks.updateGift,
  reserveGift: mocks.reserveGift,
  releaseGift: mocks.releaseGift,
  softDeleteGift: mocks.softDeleteGift,
}));

import {
  createGiftAction,
  listGiftsAction,
  markGiftReceivedAction,
  releaseGiftAction,
  removeGiftAction,
  reserveGiftAction,
  updateGiftAction,
} from './actions';

const ME = '0194c5e0-0000-7000-8000-0000000000a1';
const PARTNER = '0194c5e0-0000-7000-8000-0000000000a2';
const STRANGER = '0194c5e0-0000-7000-8000-0000000000ff';
const GIFT_ID = '0194c5e0-0000-7000-8000-000000000091';
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

function giftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GIFT_ID,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    ownerMemberId: PARTNER,
    title: 'Relógio',
    category: 'accessory',
    url: null,
    imageUrl: null,
    priceCents: null,
    notes: null,
    reservedByMemberId: null,
    reservedAt: null,
    receivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: ME, coupleId: 'couple-1' });
  mocks.findCoupleMembers.mockResolvedValue([{ id: ME }, { id: PARTNER }]);
});

describe('dono da lista', () => {
  it('dono de outro casal ou id malformado dá "Presente não encontrado" sem tocar nos presentes', async () => {
    expect(await listGiftsAction({ ownerId: STRANGER, status: 'wanted' })).toMatchObject({
      ok: false,
      message: 'Presente não encontrado',
    });
    expect(await listGiftsAction({ ownerId: 'nao-uuid', status: 'wanted' })).toMatchObject({
      ok: false,
      message: 'Presente não encontrado',
    });
    expect(mocks.findCoupleMembers).toHaveBeenCalledWith('couple-1');
    expect(mocks.listGiftsByStatus).not.toHaveBeenCalled();
  });

  it('só o dono cria, edita, exclui e marca como recebido', async () => {
    mocks.findActiveGift.mockResolvedValue(giftRow());
    const denied = { ok: false, message: 'Só o dono mexe na própria lista' };

    expect(
      await createGiftAction({ ownerId: PARTNER, data: { title: 'x', category: 'other' } }),
    ).toMatchObject(denied);
    expect(
      await updateGiftAction({ ownerId: PARTNER, giftId: GIFT_ID, data: { title: 'y' } }),
    ).toMatchObject(denied);
    expect(await removeGiftAction({ ownerId: PARTNER, giftId: GIFT_ID })).toMatchObject(denied);
    expect(await markGiftReceivedAction({ ownerId: PARTNER, giftId: GIFT_ID })).toMatchObject(
      denied,
    );
    expect(mocks.insertGift).not.toHaveBeenCalled();
    expect(mocks.updateGift).not.toHaveBeenCalled();
    expect(mocks.softDeleteGift).not.toHaveBeenCalled();
  });
});

describe('privacidade da reserva', () => {
  it('o dono nunca recebe campos de reserva, em listar, criar, editar e recebido', async () => {
    const reserved = giftRow({
      ownerMemberId: ME,
      reservedByMemberId: PARTNER,
      reservedAt: CREATED_AT,
    });
    mocks.listGiftsByStatus.mockResolvedValue([reserved]);
    mocks.findActiveGift.mockResolvedValue(reserved);
    mocks.insertGift.mockResolvedValue(reserved);
    mocks.updateGift.mockResolvedValue(reserved);

    const results = await Promise.all([
      listGiftsAction({ ownerId: ME, status: 'wanted' }),
      createGiftAction({ ownerId: ME, data: { title: 'Relógio', category: 'accessory' } }),
      updateGiftAction({ ownerId: ME, giftId: GIFT_ID, data: { title: 'Novo' } }),
      markGiftReceivedAction({ ownerId: ME, giftId: GIFT_ID }),
    ]);

    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(JSON.stringify(result)).not.toContain('reserved');
      expect(JSON.stringify(result)).not.toContain(PARTNER);
    }
  });

  it('o parceiro vê quem reservou', async () => {
    mocks.listGiftsByStatus.mockResolvedValue([
      giftRow({ reservedByMemberId: ME, reservedAt: CREATED_AT }),
    ]);

    expect(await listGiftsAction({ ownerId: PARTNER, status: 'wanted' })).toMatchObject({
      ok: true,
      data: { gifts: [{ reservedByMemberId: ME }] },
    });
  });
});

describe('reservar e liberar', () => {
  it('o dono não reserva nem libera a própria lista', async () => {
    mocks.findActiveGift.mockResolvedValue(giftRow({ ownerMemberId: ME }));
    const denied = { ok: false, message: 'Você não reserva presentes da própria lista' };

    expect(await reserveGiftAction({ ownerId: ME, giftId: GIFT_ID })).toMatchObject(denied);
    expect(await releaseGiftAction({ ownerId: ME, giftId: GIFT_ID })).toMatchObject(denied);
    expect(mocks.reserveGift).not.toHaveBeenCalled();
    expect(mocks.releaseGift).not.toHaveBeenCalled();
  });

  it('reservar grava a reserva de quem pede', async () => {
    const gift = giftRow();
    mocks.findActiveGift.mockResolvedValue(gift);
    mocks.reserveGift.mockResolvedValue(
      giftRow({ reservedByMemberId: ME, reservedAt: CREATED_AT }),
    );

    expect(await reserveGiftAction({ ownerId: PARTNER, giftId: GIFT_ID })).toMatchObject({
      ok: true,
      data: { reservedByMemberId: ME },
    });
    expect(mocks.reserveGift).toHaveBeenCalledWith(gift, ME);
  });

  it('reserva simultânea: a segunda falha com "já foi reservado"', async () => {
    mocks.findActiveGift.mockResolvedValue(giftRow());
    mocks.reserveGift.mockResolvedValue(null);

    expect(await reserveGiftAction({ ownerId: PARTNER, giftId: GIFT_ID })).toMatchObject({
      ok: false,
      message: 'Este presente já foi reservado',
    });
  });

  it('liberar desfaz só a reserva de quem pede e devolve o estado atual', async () => {
    const gift = giftRow({ reservedByMemberId: PARTNER });
    mocks.findActiveGift.mockResolvedValue(gift);

    const result = await releaseGiftAction({ ownerId: PARTNER, giftId: GIFT_ID });

    expect(mocks.releaseGift).toHaveBeenCalledWith(gift, ME);
    expect(result).toMatchObject({ ok: true, data: { id: GIFT_ID } });
  });
});

describe('imagem do presente', () => {
  it('criar com URL e sem imagem busca o og:image; imagem manual vence', async () => {
    mocks.findActiveGift.mockResolvedValue(giftRow({ ownerMemberId: ME }));
    mocks.insertGift.mockImplementation(async (data: Record<string, unknown>) =>
      giftRow({ ownerMemberId: ME, ...data }),
    );
    mocks.findOgImageUrl.mockResolvedValue('https://cdn.example/og.png');

    await createGiftAction({
      ownerId: ME,
      data: { title: 'Relógio', category: 'accessory', url: 'https://loja.example/x' },
    });
    expect(mocks.insertGift).toHaveBeenLastCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
        ownerMemberId: ME,
        imageUrl: 'https://cdn.example/og.png',
      }),
    );

    mocks.findOgImageUrl.mockClear();
    await createGiftAction({
      ownerId: ME,
      data: {
        title: 'Relógio',
        category: 'accessory',
        url: 'https://loja.example/x',
        imageUrl: 'https://cdn.example/manual.png',
      },
    });
    expect(mocks.findOgImageUrl).not.toHaveBeenCalled();
  });

  it('editar: a mesma URL mantém a imagem e apagar a URL apaga a imagem', async () => {
    mocks.findActiveGift.mockResolvedValue(
      giftRow({
        ownerMemberId: ME,
        url: 'https://loja.example/x',
        imageUrl: 'https://cdn/old.png',
      }),
    );
    mocks.updateGift.mockResolvedValue(giftRow({ ownerMemberId: ME }));

    await updateGiftAction({
      ownerId: ME,
      giftId: GIFT_ID,
      data: { url: 'https://loja.example/x', title: 'Novo' },
    });
    expect(mocks.updateGift.mock.lastCall?.[3].imageUrl).toBeUndefined();
    expect(mocks.findOgImageUrl).not.toHaveBeenCalled();

    await updateGiftAction({ ownerId: ME, giftId: GIFT_ID, data: { url: null } });
    expect(mocks.updateGift.mock.lastCall?.[3].imageUrl).toBeNull();
  });
});
