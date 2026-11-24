'use client';

import { Gift, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { FilterChip } from '@/features/tasks/components/filter-chip';
import { applyActionError } from '@/lib/action-error';
import { useGifts, useMarkGiftReceived, useToggleGiftReservation } from '../hooks/use-gifts';
import { hasReservationFields } from '../lib/gift-format';
import { filterGiftsByPrice, type GiftPriceFilter } from '../lib/gift-price-filter';
import { GiftCard } from './gift-card';
import { GiftPriceFilters } from './gift-price-filters';
import { GiftSheet } from './gift-sheet.client';
import type { GiftResponse } from '@/features/gifts/gift-schemas';
import type { CoupleMember } from '@/features/couple/couple-schemas';

type GiftListProps = { owner: CoupleMember; me: CoupleMember };

/** Lista própria: editar e marcar recebido, sem nenhum indício de reserva. */
function OwnGiftActions({ gift, ownerId }: { gift: GiftResponse; ownerId: string }) {
  const markReceived = useMarkGiftReceived(ownerId);
  if (gift.receivedAt) return null;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={markReceived.isPending}
      onClick={() =>
        markReceived.mutate(gift.id, {
          onSuccess: () => toast.success('Presente recebido'),
          onError: (error) => applyActionError(error),
        })
      }
    >
      Recebi
    </Button>
  );
}

/** Lista da outra pessoa: reservar e desfazer a própria reserva. */
function PartnerGiftActions({ gift, owner, me }: { gift: GiftResponse } & GiftListProps) {
  const toggle = useToggleGiftReservation(owner.id);
  if (gift.receivedAt || !hasReservationFields(gift)) return null;

  const reservedByMe = gift.reservedByMemberId === me.id;
  if (gift.reservedByMemberId && !reservedByMe) return null;

  return (
    <Button
      type="button"
      variant={reservedByMe ? 'outline' : 'default'}
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(
          { giftId: gift.id, reserve: !reservedByMe },
          {
            onSuccess: () =>
              toast.success(reservedByMe ? 'Reserva desfeita' : 'Presente reservado'),
            onError: (error) => applyActionError(error),
          },
        )
      }
    >
      {reservedByMe ? 'Desfazer reserva' : 'Reservar'}
    </Button>
  );
}

function reservationStatus(gift: GiftResponse, me: CoupleMember) {
  if (!hasReservationFields(gift) || !gift.reservedByMemberId) return null;

  const text = gift.reservedByMemberId === me.id ? 'Você reservou' : 'Reservado';
  return <p className="text-sm font-medium text-primary">{text}</p>;
}

function GiftList({ owner, me }: GiftListProps) {
  const wanted = useGifts(owner.id, 'wanted');
  const received = useGifts(owner.id, 'received');
  const [editing, setEditing] = useState<{ gift: GiftResponse | null } | null>(null);
  const [priceFilter, setPriceFilter] = useState<GiftPriceFilter>('all');
  const isMine = owner.id === me.id;

  const renderCard = (gift: GiftResponse) => (
    <GiftCard
      key={gift.id}
      gift={gift}
      status={isMine ? null : reservationStatus(gift, me)}
      actions={
        isMine ? (
          <>
            <Button type="button" variant="outline" onClick={() => setEditing({ gift })}>
              Editar
            </Button>
            <OwnGiftActions gift={gift} ownerId={owner.id} />
          </>
        ) : (
          <PartnerGiftActions gift={gift} owner={owner} me={me} />
        )
      }
    />
  );

  if (wanted.isPending) return <LoadingState variant="rows" />;
  if (wanted.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os presentes"
        description="Tente de novo."
        onRetry={() => void wanted.refetch()}
      />
    );
  }

  const receivedGifts = received.data?.gifts ?? [];
  const hasAnyGift = wanted.data.gifts.length > 0 || receivedGifts.length > 0;
  const visibleWanted = filterGiftsByPrice(wanted.data.gifts, priceFilter);
  const visibleReceived = filterGiftsByPrice(receivedGifts, priceFilter);

  return (
    <div className="flex flex-col gap-4">
      {isMine ? (
        <Button type="button" onClick={() => setEditing({ gift: null })}>
          <Plus className="size-4" aria-hidden />
          Novo presente
        </Button>
      ) : null}
      {wanted.data.gifts.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-6" aria-hidden />}
          title="Nenhum presente na lista"
          description={
            isMine ? 'Anote o que você gostaria de ganhar.' : 'A lista ainda está vazia.'
          }
        />
      ) : null}
      {hasAnyGift ? <GiftPriceFilters value={priceFilter} onChange={setPriceFilter} /> : null}
      {hasAnyGift && visibleWanted.length === 0 && visibleReceived.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-6" aria-hidden />}
          title="Nenhum presente nessa faixa de preço"
          description="Escolha outra faixa para ver mais presentes."
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">{visibleWanted.map(renderCard)}</div>

      {visibleReceived.length > 0 ? (
        <section aria-label="Recebidos" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Recebidos</h2>
          <div className="grid gap-3 sm:grid-cols-2">{visibleReceived.map(renderCard)}</div>
        </section>
      ) : null}

      {isMine ? (
        <GiftSheet
          ownerId={owner.id}
          open={editing !== null}
          gift={editing?.gift ?? null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function GiftsTab() {
  const couple = useCouple();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  if (couple.isPending) return <LoadingState variant="rows" />;
  if (couple.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o casal"
        description="Tente de novo."
        onRetry={() => void couple.refetch()}
      />
    );
  }

  const me = couple.data.members.find((member) => member.isMe);
  if (!me) return null;

  const owner = couple.data.members.find((member) => member.id === ownerId) ?? me;
  const membersMeFirst = [me, ...couple.data.members.filter((member) => !member.isMe)];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Lista de quem" className="flex flex-wrap gap-2">
        {membersMeFirst.map((member) => (
          <FilterChip
            key={member.id}
            active={owner.id === member.id}
            color={member.color}
            member={member}
            onClick={() => setOwnerId(member.id)}
          >
            {member.isMe ? 'Meus' : member.displayName}
          </FilterChip>
        ))}
      </div>
      <GiftList key={owner.id} owner={owner} me={me} />
    </div>
  );
}
