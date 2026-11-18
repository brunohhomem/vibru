'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { GIFT_CATEGORIES, type GiftResponse } from '@vibru/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { HealthSheet } from '@/features/health/components/health-sheet.client';
import { applyApiError } from '@/lib/api-error';
import { formatCents, parseReaisToCents } from '@/lib/money';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateGift, useDeleteGift, useUpdateGift } from '../hooks/use-gifts';
import { giftCategoryLabel } from '../lib/gift-format';
import { giftFormSchema, type GiftFormValues } from '../schemas/forms';

type GiftSheetProps = {
  ownerId: string;
  open: boolean;
  gift: GiftResponse | null;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(gift: GiftResponse | null): GiftFormValues {
  return {
    title: gift?.title ?? '',
    category: gift?.category ?? 'clothing',
    url: gift?.url ?? '',
    imageUrl: gift?.imageUrl ?? '',
    price: gift?.priceCents != null ? formatCents(gift.priceCents).replace(/^R\$\s/, '') : '',
    notes: gift?.notes ?? '',
  };
}

/** Mesma regra dos desejos: só manda a imagem quando a pessoa mexeu nela. */
function payloadFrom(values: GiftFormValues, gift: GiftResponse | null) {
  const imageUrl = values.imageUrl || null;
  const imageChanged = imageUrl !== (gift?.imageUrl ?? null);

  return {
    title: values.title,
    category: values.category,
    url: values.url || null,
    priceCents: values.price.trim() ? parseReaisToCents(values.price) : null,
    notes: values.notes || null,
    ...(imageChanged ? { imageUrl } : {}),
  };
}

export function GiftSheet({ ownerId, open, gift, onOpenChange }: GiftSheetProps) {
  const createGift = useCreateGift(ownerId);
  const updateGift = useUpdateGift(ownerId);
  const deleteGift = useDeleteGift(ownerId);
  const form = useForm<GiftFormValues>({
    resolver: zodResolver(giftFormSchema),
    defaultValues: valuesFrom(gift),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(gift));
  }, [open, gift, form]);

  async function onSubmit(values: GiftFormValues) {
    const payload = payloadFrom(values, gift);

    try {
      if (gift) {
        await updateGift.mutateAsync({ giftId: gift.id, payload });
      } else {
        await createGift.mutateAsync(payload);
      }
      toast.success(gift ? 'Presente atualizado' : 'Presente adicionado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeGift() {
    if (!gift) return;

    deleteGift.mutate(gift.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Presente removido');
      },
      onError: (error) => applyApiError(error),
    });
  }

  const errors = form.formState.errors;

  return (
    <HealthSheet
      title={gift ? 'Editar presente' : 'Novo presente'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createGift.isPending || updateGift.isPending}
      removal={
        gift
          ? {
              label: 'Remover presente',
              title: 'Remover presente?',
              description: `"${gift.title}" some da sua lista.`,
              pending: deleteGift.isPending,
              onConfirm: removeGift,
            }
          : undefined
      }
    >
      <Field id="gift-title" label="Título" error={errors.title?.message}>
        <Input id="gift-title" autoComplete="off" {...form.register('title')} />
      </Field>
      <Field id="gift-category" label="Categoria" error={errors.category?.message}>
        <NativeSelect id="gift-category" {...form.register('category')}>
          {GIFT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {giftCategoryLabel(category)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="gift-url" label="Link" error={errors.url?.message}>
        <Input id="gift-url" type="url" inputMode="url" {...form.register('url')} />
      </Field>
      <Field
        id="gift-image"
        label="Link da imagem"
        hint="Use quando a imagem não aparecer sozinha."
        error={errors.imageUrl?.message}
      >
        <Input id="gift-image" type="url" inputMode="url" {...form.register('imageUrl')} />
      </Field>
      <Field id="gift-price" label="Preço (R$)" error={errors.price?.message}>
        <Input id="gift-price" inputMode="decimal" {...form.register('price')} />
      </Field>
      <Field id="gift-notes" label="Observações" error={errors.notes?.message}>
        <Textarea id="gift-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
