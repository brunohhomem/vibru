import type {
  Allergy,
  Doctor,
  EmergencyContact,
  HealthCondition,
  HealthProfile,
  Medication,
} from '@vibru/shared';
import { AlertTriangle, Pencil, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPhone } from '@/lib/masks';
import {
  bloodTypeLabel,
  SEVERITY_LABELS,
  isMedicationLowStock,
  medicationScheduleLabel,
  medicationStockLabel,
  medicationTitle,
  organDonorLabel,
} from '../lib/health-format';

type SectionProps = {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
  empty?: string;
  isEmpty?: boolean;
  children: ReactNode;
};

function Section({ title, addLabel, onAdd, empty, isEmpty, children }: SectionProps) {
  return (
    <Card aria-label={title} role="region">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {onAdd ? (
          <Button type="button" variant="outline" onClick={onAdd}>
            <Plus className="size-4" aria-hidden />
            {addLabel ?? 'Adicionar'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 py-2">
        {isEmpty ? <p className="py-2 text-sm text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

type RowProps = {
  label: string;
  title: string;
  subtitle?: string | null;
  tone?: 'default' | 'alert';
  trailing?: ReactNode;
  onOpen: () => void;
};

function Row({ label, title, subtitle, tone = 'default', trailing, onOpen }: RowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={
            tone === 'alert'
              ? 'flex items-center gap-1.5 text-base font-medium text-destructive'
              : 'text-base font-medium'
          }
        >
          {tone === 'alert' ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : null}
          <span className="break-words">{title}</span>
        </span>
        {subtitle ? <span className="text-sm text-muted-foreground">{subtitle}</span> : null}
      </span>
      {trailing}
    </button>
  );
}

export function ProfileSection({
  profile,
  onEdit,
}: {
  profile: HealthProfile;
  onEdit: () => void;
}) {
  const facts: { label: string; value: string }[] = [
    { label: 'Tipo sanguíneo', value: bloodTypeLabel(profile.bloodType) },
    { label: 'Doador de órgãos', value: organDonorLabel(profile.organDonor) },
    { label: 'Plano de saúde', value: profile.healthPlanName ?? 'Não informado' },
    { label: 'Número do plano', value: profile.healthPlanNumber ?? 'Não informado' },
    { label: 'Hospital de preferência', value: profile.preferredHospital ?? 'Não informado' },
  ];

  return (
    <Card aria-label="Dados da ficha" role="region">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Dados da ficha</CardTitle>
        <Button type="button" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Editar dados
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="text-base font-medium break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {profile.notes ? (
          <p className="mt-3 text-sm text-muted-foreground">{profile.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ListSectionProps<T> = {
  items: T[];
  onAdd: () => void;
  onEdit: (item: T) => void;
};

export function AllergiesSection({ items, onAdd, onEdit }: ListSectionProps<Allergy>) {
  return (
    <Section
      title="Alergias"
      onAdd={onAdd}
      isEmpty={items.length === 0}
      empty="Nenhuma alergia cadastrada."
    >
      {items.map((allergy) => (
        <Row
          key={allergy.id}
          label={`Editar alergia ${allergy.substance}`}
          title={allergy.substance}
          subtitle={[SEVERITY_LABELS[allergy.severity], allergy.reaction]
            .filter(Boolean)
            .join(' · ')}
          tone={allergy.severity === 'severe' ? 'alert' : 'default'}
          onOpen={() => onEdit(allergy)}
        />
      ))}
    </Section>
  );
}

export function ConditionsSection({ items, onAdd, onEdit }: ListSectionProps<HealthCondition>) {
  return (
    <Section
      title="Condições"
      onAdd={onAdd}
      isEmpty={items.length === 0}
      empty="Nenhuma condição cadastrada."
    >
      {items.map((condition) => (
        <Row
          key={condition.id}
          label={`Editar condição ${condition.name}`}
          title={condition.name}
          subtitle={condition.notes}
          onOpen={() => onEdit(condition)}
        />
      ))}
    </Section>
  );
}

export function ContactsSection({ items, onAdd, onEdit }: ListSectionProps<EmergencyContact>) {
  return (
    <Section
      title="Contatos de emergência"
      onAdd={onAdd}
      isEmpty={items.length === 0}
      empty="Nenhum contato cadastrado."
    >
      {items.map((contact) => (
        <Row
          key={contact.id}
          label={`Editar contato ${contact.name}`}
          title={contact.name}
          subtitle={`${contact.relationship} · ${formatPhone(contact.phone)}`}
          onOpen={() => onEdit(contact)}
        />
      ))}
    </Section>
  );
}

export function DoctorsSection({ items, onAdd, onEdit }: ListSectionProps<Doctor>) {
  return (
    <Section
      title="Médicos"
      onAdd={onAdd}
      isEmpty={items.length === 0}
      empty="Nenhum médico cadastrado."
    >
      {items.map((doctor) => (
        <Row
          key={doctor.id}
          label={`Editar médico ${doctor.name}`}
          title={doctor.name}
          subtitle={[doctor.specialty, doctor.phone ? formatPhone(doctor.phone) : null]
            .filter(Boolean)
            .join(' · ')}
          onOpen={() => onEdit(doctor)}
        />
      ))}
    </Section>
  );
}

export function MedicationsSection({ items, onAdd, onEdit }: ListSectionProps<Medication>) {
  return (
    <Section
      title="Remédios"
      onAdd={onAdd}
      isEmpty={items.length === 0}
      empty="Nenhum remédio cadastrado."
    >
      {items.map((medication) => (
        <Row
          key={medication.id}
          label={`Editar remédio ${medication.name}`}
          title={medicationTitle(medication)}
          subtitle={[medicationScheduleLabel(medication), medicationStockLabel(medication)]
            .filter(Boolean)
            .join(' · ')}
          trailing={isMedicationLowStock(medication) ? <Badge tone="warn">Acabando</Badge> : null}
          onOpen={() => onEdit(medication)}
        />
      ))}
    </Section>
  );
}
