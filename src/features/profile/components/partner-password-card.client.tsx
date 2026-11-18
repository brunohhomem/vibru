'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { resetPartnerPasswordAction } from '@/features/auth/password-actions';
import { useCouple } from '@/features/couple/hooks/use-couple';
import { onFormSubmit } from '@/lib/submit-form';
import { ActionResultError, unwrapActionResult } from '@/lib/unwrap-action-result';
import { resetPartnerPasswordSchema } from '../schemas';

type PartnerPasswordValues = { currentPassword: string; newPassword: string };

/** Quem esqueceu a senha pede ao outro: não há e-mail de redefinição. */
export function PartnerPasswordCard() {
  const couple = useCouple();
  const partner = couple.data?.members.find((member) => !member.isMe);
  const form = useForm<PartnerPasswordValues>({
    resolver: zodResolver(resetPartnerPasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  if (!partner) return null;

  async function onSubmit(values: PartnerPasswordValues) {
    try {
      unwrapActionResult(await resetPartnerPasswordAction(values));
      toast.success(`Senha de ${partner?.displayName ?? 'quem'} redefinida`);
      form.reset();
    } catch (error) {
      if (error instanceof ActionResultError && error.field === 'currentPassword') {
        form.setError('currentPassword', { message: error.message });
        return;
      }
      toast.error(error instanceof ActionResultError ? error.message : 'Não foi possível salvar.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Senha de {partner.displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
          noValidate
        >
          <Field
            id="partnerCurrentPassword"
            label="Sua senha atual"
            hint="Confirma que é você."
            error={form.formState.errors.currentPassword?.message}
          >
            <Input
              id="partnerCurrentPassword"
              type="password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
          </Field>
          <Field
            id="partnerNewPassword"
            label="Nova senha provisória"
            hint="Quem recebe troca a senha no próximo acesso."
            error={form.formState.errors.newPassword?.message}
          >
            <Input
              id="partnerNewPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('newPassword')}
            />
          </Field>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando…' : 'Redefinir senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
