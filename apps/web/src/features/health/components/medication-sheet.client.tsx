'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_LOW_STOCK_DAYS, MAX_MEDICATION_TIMES, type Medication } from '@vibru/shared';
import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api-error';
import { onFormSubmit } from '@/lib/submit-form';
import { useCreateMedication, useDeleteMedication, useUpdateMedication } from '../hooks/use-health';
import { medicationFormSchema, type MedicationFormValues } from '../schemas/forms';
import { HealthSheet } from './health-sheet.client';

type MedicationSheetProps = {
  memberId: string;
  open: boolean;
  medication: Medication | null;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_TIME = '08:00';

function valuesFrom(medication: Medication | null): MedicationFormValues {
  const stockUnits = medication?.stockUnits ?? null;

  return {
    name: medication?.name ?? '',
    dosage: medication?.dosage ?? '',
    instructions: medication?.instructions ?? '',
    times: medication?.times ?? [],
    isContinuous: medication?.isContinuous ?? true,
    controlStock: stockUnits !== null,
    stockUnits: stockUnits !== null ? String(stockUnits) : '',
    unitsPerDose: String(medication?.unitsPerDose ?? 1),
    lowStockDays: String(medication?.lowStockDays ?? DEFAULT_LOW_STOCK_DAYS),
  };
}

function toPayload(values: MedicationFormValues) {
  return {
    name: values.name,
    dosage: values.dosage,
    instructions: values.instructions,
    times: [...values.times].sort(),
    isContinuous: values.isContinuous,
    stockUnits: values.controlStock ? Number(values.stockUnits) : null,
    unitsPerDose: Number(values.unitsPerDose),
    lowStockDays: Number(values.lowStockDays),
  };
}

type TimesEditorProps = {
  times: string[];
  error?: string;
  onChange: (times: string[]) => void;
};

function TimesEditor({ times, error, onChange }: TimesEditorProps) {
  return (
    <Field
      id="medication-times"
      label="Horários"
      hint={
        times.length === 0 ? 'Sem horário, vira "quando precisar" e não cria lembrete.' : undefined
      }
      error={error}
    >
      <div className="flex flex-col gap-2">
        {times.map((time, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="time"
              aria-label={`Horário ${index + 1}`}
              value={time}
              onChange={(event) =>
                onChange(times.map((current, at) => (at === index ? event.target.value : current)))
              }
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Remover horário ${index + 1}`}
              onClick={() => onChange(times.filter((_, at) => at !== index))}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        {times.length < MAX_MEDICATION_TIMES ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange([...times, DEFAULT_TIME])}
          >
            <Plus className="size-4" aria-hidden />
            Adicionar horário
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

type SwitchRowProps = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function SwitchRow({ id, label, checked, onCheckedChange }: SwitchRowProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function MedicationSheet({
  memberId,
  open,
  medication,
  onOpenChange,
}: MedicationSheetProps) {
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();
  const deleteMedication = useDeleteMedication();
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: valuesFrom(medication),
  });
  const times = form.watch('times');
  const controlStock = form.watch('controlStock');
  const isContinuous = form.watch('isContinuous');
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset(valuesFrom(medication));
  }, [open, medication, form]);

  async function onSubmit(values: MedicationFormValues) {
    const payload = toPayload(values);

    try {
      if (medication) {
        await updateMedication.mutateAsync({ medicationId: medication.id, payload });
      } else {
        await createMedication.mutateAsync({ memberId, payload });
      }
      toast.success(medication ? 'Remédio atualizado' : 'Remédio adicionado');
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  }

  function removeMedication() {
    if (!medication) return;

    deleteMedication.mutate(medication.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success('Remédio removido');
      },
      onError: (error) => applyApiError(error),
    });
  }

  return (
    <HealthSheet
      title={medication ? 'Editar remédio' : 'Novo remédio'}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onFormSubmit(form.handleSubmit(onSubmit))}
      pending={createMedication.isPending || updateMedication.isPending}
      removal={
        medication
          ? {
              label: 'Remover remédio',
              title: 'Remover remédio?',
              description: `"${medication.name}" sai da ficha e os lembretes abertos somem.`,
              pending: deleteMedication.isPending,
              onConfirm: removeMedication,
            }
          : undefined
      }
    >
      <Field id="medication-name" label="Nome" error={errors.name?.message}>
        <Input id="medication-name" autoComplete="off" {...form.register('name')} />
      </Field>
      <Field id="medication-dosage" label="Dosagem" error={errors.dosage?.message}>
        <Input
          id="medication-dosage"
          autoComplete="off"
          placeholder="500 mg"
          {...form.register('dosage')}
        />
      </Field>
      <Field id="medication-instructions" label="Instruções" error={errors.instructions?.message}>
        <Textarea id="medication-instructions" rows={2} {...form.register('instructions')} />
      </Field>

      <TimesEditor
        times={times}
        error={errors.times?.message ?? errors.times?.root?.message}
        onChange={(next) => form.setValue('times', next, { shouldValidate: true })}
      />

      <SwitchRow
        id="medication-continuous"
        label="Uso contínuo"
        checked={isContinuous}
        onCheckedChange={(checked) => form.setValue('isContinuous', checked)}
      />
      <SwitchRow
        id="medication-control-stock"
        label="Controlar estoque"
        checked={controlStock}
        onCheckedChange={(checked) => form.setValue('controlStock', checked)}
      />

      {controlStock ? (
        <>
          <Field
            id="medication-stock"
            label="Unidades em estoque"
            error={errors.stockUnits?.message}
          >
            <Input
              id="medication-stock"
              type="number"
              inputMode="numeric"
              min={0}
              {...form.register('stockUnits')}
            />
          </Field>
          <Field
            id="medication-per-dose"
            label="Unidades por dose"
            error={errors.unitsPerDose?.message}
          >
            <Input
              id="medication-per-dose"
              type="number"
              inputMode="numeric"
              min={1}
              {...form.register('unitsPerDose')}
            />
          </Field>
          <Field
            id="medication-low-days"
            label="Avisar quando restarem (dias)"
            error={errors.lowStockDays?.message}
          >
            <Input
              id="medication-low-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              {...form.register('lowStockDays')}
            />
          </Field>
        </>
      ) : null}
    </HealthSheet>
  );
}
