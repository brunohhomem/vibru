'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { WISH_CATEGORIES, type Wish, type WishCategory } from '@vibru/shared';
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
import { useCreateWish, useDeleteWish, useUpdateWish } from '../hooks/use-wishes';
import { wishCategoryLabel } from '../lib/wish-format';
import { wishFormSchema, type WishFormValues } from '../schemas/forms';

type WishSheetProps = {
  open: boolean;
  wish: Wish | null;
  defaultCategory: WishCategory;
  onOpenChange: (open: boolean) => void;
};

function valuesFrom(wish: Wish | null, defaultCategory: WishCategory): WishFormValues {
  return {
    title: wish?.title ?? '',
    category: wish?.category ?? defaultCategory,
    url: wish?.url ?? '',
    imageUrl: wish?.imageUrl ?? '',
    price: wish?.priceCents != null ? formatCents(wish.priceCents).replace(/^R\$\s/, '') : '',
    notes: wish?.notes ?? '',
  };
}

/** Só manda a imagem quando a pessoa mexeu nela; senão a API busca o `og:image` da URL. */
function payloadFrom(values: WishFormValues, wish: Wish | null) {
  const imageUrl = values.imageUrl || null;
  const imageChanged = imageUrl !== (wish?.imageUrl ?? null);

  return {
    title: values.title,
    category: values.category,
    url: values.url || null,
    priceCents: values.price.trim() ? parseReaisToCents(values.price) : null,
    notes: values.notes || null,
    ...(imageChanged ? { imageUrl } : {}),
  };
}

export function WishSheet({ open, wish, defaultCategory, onOpenChange }: WishSheetProps) {
  const createWish = useCreateWish();
  const updateWish = useUpdateWish();
  const deleteWish = useDeleteWish();
  const form = useForm<WishFormValues>({
    resolver: zodResolver(wishFormSchema),
    defaultValues: valuesFrom(wish, defaultCategory),
  });

  useEffect(() => {
    if (open) form.reset(valuesFrom(wish, defaultCategory));
  }, [open, wish, defaultCategory, form]);

  async function onSubmit(values: WishFormValues) {
    const payload = payloadFrom(values, wish);

    try {
      if (wish) {
        await updateWish.mutateAsync({ wishId: wish.id, payload });
      } else {
        await createWish.mutateAsync(payload);
      }
      toast.success(wish ? 'Desejo atualizado' : 'Desejo adicionado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeWish() {
    if (!wish) return;

    deleteWish.mutate(wish.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Desejo removido');
      },
      onError: (error) => applyApiError(error),
    });
  }

  const errors = form.formState.errors;

  return (
    <HealthSheet
      title={wish ? 'Editar desejo' : 'Novo desejo'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createWish.isPending || updateWish.isPending}
      removal={
        wish
          ? {
              label: 'Remover desejo',
              title: 'Remover desejo?',
              description: `"${wish.title}" some da lista. Eventos já planejados ficam na Agenda.`,
              pending: deleteWish.isPending,
              onConfirm: removeWish,
            }
          : undefined
      }
    >
      <Field id="wish-title" label="Título" error={errors.title?.message}>
        <Input id="wish-title" autoComplete="off" {...form.register('title')} />
      </Field>
      <Field id="wish-category" label="Categoria" error={errors.category?.message}>
        <NativeSelect id="wish-category" {...form.register('category')}>
          {WISH_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {wishCategoryLabel(category)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="wish-url" label="Link" error={errors.url?.message}>
        <Input id="wish-url" type="url" inputMode="url" {...form.register('url')} />
      </Field>
      <Field
        id="wish-image"
        label="Link da imagem"
        hint="Use quando a imagem não aparecer sozinha."
        error={errors.imageUrl?.message}
      >
        <Input id="wish-image" type="url" inputMode="url" {...form.register('imageUrl')} />
      </Field>
      <Field id="wish-price" label="Preço (R$)" error={errors.price?.message}>
        <Input id="wish-price" inputMode="decimal" {...form.register('price')} />
      </Field>
      <Field id="wish-notes" label="Observações" error={errors.notes?.message}>
        <Textarea id="wish-notes" rows={3} {...form.register('notes')} />
      </Field>
    </HealthSheet>
  );
}
