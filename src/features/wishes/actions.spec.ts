import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findOgImageUrl: vi.fn(),
  listWishesByStatus: vi.fn(),
  findActiveWish: vi.fn(),
  insertWish: vi.fn(),
  updateWish: vi.fn(),
  softDeleteWish: vi.fn(),
  insertEvent: vi.fn(),
  detachWishFromEvents: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/features/link-preview/og-image-service', () => ({
  findOgImageUrl: mocks.findOgImageUrl,
}));
vi.mock('./wishes-repository', () => ({
  listWishesByStatus: mocks.listWishesByStatus,
  findActiveWish: mocks.findActiveWish,
  insertWish: mocks.insertWish,
  updateWish: mocks.updateWish,
  softDeleteWish: mocks.softDeleteWish,
}));
vi.mock('@/features/agenda/agenda-repository', () => ({
  insertEvent: mocks.insertEvent,
  detachWishFromEvents: mocks.detachWishFromEvents,
}));

import {
  createWishAction,
  listWishesAction,
  planWishAction,
  removeWishAction,
  setWishDoneAction,
  updateWishAction,
} from './actions';

const WISH_ID = '0194c5e0-0000-7000-8000-0000000000c1';
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');

function wishRow(overrides: Record<string, unknown> = {}) {
  return {
    id: WISH_ID,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    coupleId: 'couple-1',
    title: 'Viagem',
    category: 'travel',
    url: null,
    imageUrl: null,
    priceCents: null,
    notes: null,
    doneAt: null,
    plannedOn: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: 'member-1', coupleId: 'couple-1' });
  mocks.findActiveWish.mockResolvedValue(wishRow());
  mocks.insertWish.mockImplementation(async (data: Record<string, unknown>) => wishRow(data));
});

describe('listWishesAction', () => {
  it('lista pelo status e pelo casal do membro', async () => {
    mocks.listWishesByStatus.mockResolvedValue([wishRow()]);

    const result = await listWishesAction({ status: 'open' });

    expect(result).toMatchObject({ ok: true, data: { wishes: [{ id: WISH_ID }] } });
    expect(mocks.listWishesByStatus).toHaveBeenCalledWith('couple-1', 'open', expect.any(String));
  });
});

describe('createWishAction', () => {
  it('com URL e sem imagem busca o og:image e grava a imagem encontrada', async () => {
    mocks.findOgImageUrl.mockResolvedValue('https://cdn.example/og.png');

    await createWishAction({ title: 'Viagem', category: 'travel', url: 'https://loja.example/x' });

    expect(mocks.findOgImageUrl).toHaveBeenCalledWith('https://loja.example/x');
    expect(mocks.insertWish).toHaveBeenCalledWith(
      expect.objectContaining({ coupleId: 'couple-1', imageUrl: 'https://cdn.example/og.png' }),
    );
  });

  it('imagem informada à mão vence e não dispara busca', async () => {
    await createWishAction({
      title: 'Viagem',
      category: 'travel',
      url: 'https://loja.example/x',
      imageUrl: 'https://cdn.example/manual.png',
    });

    expect(mocks.findOgImageUrl).not.toHaveBeenCalled();
    expect(mocks.insertWish).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://cdn.example/manual.png' }),
    );
  });

  it('sem URL não busca imagem', async () => {
    await createWishAction({ title: 'Viagem', category: 'travel' });

    expect(mocks.findOgImageUrl).not.toHaveBeenCalled();
    expect(mocks.insertWish).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }));
  });
});

describe('updateWishAction', () => {
  beforeEach(() => {
    mocks.findActiveWish.mockResolvedValue(
      wishRow({ url: 'https://loja.example/x', imageUrl: 'https://cdn/old.png' }),
    );
  });

  it('desejo de outro casal ou id malformado dá "Desejo não encontrado" sem gravar', async () => {
    mocks.findActiveWish.mockResolvedValue(null);

    expect(await updateWishAction({ id: WISH_ID, data: { title: 'x' } })).toMatchObject({
      ok: false,
      message: 'Desejo não encontrado',
    });
    expect(await updateWishAction({ id: 'nao-uuid', data: { title: 'x' } })).toMatchObject({
      ok: false,
      message: 'Desejo não encontrado',
    });
    expect(mocks.findActiveWish).toHaveBeenCalledWith('couple-1', WISH_ID, expect.any(String));
    expect(mocks.updateWish).not.toHaveBeenCalled();
  });

  it('URL nova busca a imagem; a mesma URL mantém a imagem atual', async () => {
    mocks.findOgImageUrl.mockResolvedValue('https://cdn/new.png');

    await updateWishAction({ id: WISH_ID, data: { url: 'https://outra.example/y' } });
    expect(mocks.updateWish).toHaveBeenLastCalledWith(
      'couple-1',
      WISH_ID,
      expect.objectContaining({ imageUrl: 'https://cdn/new.png' }),
    );

    mocks.findOgImageUrl.mockClear();
    await updateWishAction({ id: WISH_ID, data: { url: 'https://loja.example/x', title: 'Novo' } });
    expect(mocks.findOgImageUrl).not.toHaveBeenCalled();
    expect(mocks.updateWish.mock.lastCall?.[2]).not.toHaveProperty(
      'imageUrl',
      'https://cdn/new.png',
    );
    expect(mocks.updateWish.mock.lastCall?.[2].imageUrl).toBeUndefined();
  });

  it('apagar a URL apaga a imagem', async () => {
    await updateWishAction({ id: WISH_ID, data: { url: null } });

    expect(mocks.updateWish).toHaveBeenCalledWith(
      'couple-1',
      WISH_ID,
      expect.objectContaining({ imageUrl: null }),
    );
  });
});

describe('remover, concluir e planejar', () => {
  it('remover desliga o vínculo dos eventos e exclui o desejo', async () => {
    mocks.softDeleteWish.mockResolvedValue(true);

    expect(await removeWishAction({ id: WISH_ID })).toEqual({ ok: true, data: null });

    expect(mocks.detachWishFromEvents).toHaveBeenCalledWith('couple-1', WISH_ID);
    expect(mocks.softDeleteWish).toHaveBeenCalledWith('couple-1', WISH_ID);
  });

  it('marcar como feito grava a data; desmarcar grava nulo', async () => {
    await setWishDoneAction({ id: WISH_ID, done: true });
    expect(mocks.updateWish).toHaveBeenLastCalledWith('couple-1', WISH_ID, {
      doneAt: expect.any(Date),
    });

    await setWishDoneAction({ id: WISH_ID, done: false });
    expect(mocks.updateWish).toHaveBeenLastCalledWith('couple-1', WISH_ID, { doneAt: null });
  });

  it('planejar cria um evento do casal com o título do desejo e o vínculo', async () => {
    mocks.insertEvent.mockImplementation(async (data: Record<string, unknown>) => ({
      id: 'event-1',
      isActive: true,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      notes: null,
      startTime: null,
      ...data,
    }));

    const result = await planWishAction({ id: WISH_ID, data: { startsOn: '2026-12-20' } });

    expect(result).toMatchObject({
      ok: true,
      data: { title: 'Viagem', wishId: WISH_ID, startsOn: '2026-12-20' },
    });
    expect(mocks.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ coupleId: 'couple-1', title: 'Viagem', wishId: WISH_ID }),
    );
  });

  it('planejar desejo de outro casal não cria evento', async () => {
    mocks.findActiveWish.mockResolvedValue(null);

    expect(await planWishAction({ id: WISH_ID, data: { startsOn: '2026-12-20' } })).toMatchObject({
      ok: false,
      message: 'Desejo não encontrado',
    });
    expect(mocks.insertEvent).not.toHaveBeenCalled();
  });
});
