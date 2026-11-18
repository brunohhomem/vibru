'use client';

import type { HealthRecord } from '@vibru/shared';
import { AlertTriangle, ArrowLeft, Phone } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/masks';
import { useHealthRecord } from '../hooks/use-health';
import {
  SEVERITY_LABELS,
  bloodTypeLabel,
  medicationScheduleLabel,
  medicationTitle,
  phoneHref,
} from '../lib/health-format';

function EmergencySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BloodTypeSection({ record }: { record: HealthRecord }) {
  if (record.profile.bloodType === 'unknown') return null;

  return (
    <EmergencySection title="Tipo sanguíneo">
      <p className="font-display text-5xl leading-none font-semibold">
        {bloodTypeLabel(record.profile.bloodType)}
      </p>
    </EmergencySection>
  );
}

function AllergiesSection({ record }: { record: HealthRecord }) {
  if (record.allergies.length === 0) return null;

  return (
    <EmergencySection title="Alergias">
      <ul className="flex flex-col gap-2">
        {record.allergies.map((allergy) => (
          <li
            key={allergy.id}
            className={
              allergy.severity === 'severe'
                ? 'flex items-start gap-2 text-xl font-semibold text-destructive'
                : 'text-xl font-medium'
            }
          >
            {allergy.severity === 'severe' ? (
              <AlertTriangle className="mt-1 size-5 shrink-0" aria-hidden />
            ) : null}
            <span className="break-words">
              {allergy.substance}
              <span className="block text-base font-normal text-muted-foreground">
                {[SEVERITY_LABELS[allergy.severity], allergy.reaction].filter(Boolean).join(' · ')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </EmergencySection>
  );
}

function MedicationsSection({ record }: { record: HealthRecord }) {
  if (record.medications.length === 0) return null;

  return (
    <EmergencySection title="Remédios em uso">
      <ul className="flex flex-col gap-2">
        {record.medications.map((medication) => (
          <li key={medication.id} className="text-xl font-medium break-words">
            {medicationTitle(medication)}
            <span className="block text-base font-normal text-muted-foreground">
              {medicationScheduleLabel(medication)}
            </span>
          </li>
        ))}
      </ul>
    </EmergencySection>
  );
}

function ConditionsSection({ record }: { record: HealthRecord }) {
  if (record.conditions.length === 0) return null;

  return (
    <EmergencySection title="Condições">
      <ul className="flex flex-col gap-1">
        {record.conditions.map((condition) => (
          <li key={condition.id} className="text-xl font-medium break-words">
            {condition.name}
          </li>
        ))}
      </ul>
    </EmergencySection>
  );
}

function ContactsSection({ record }: { record: HealthRecord }) {
  if (record.contacts.length === 0) return null;

  return (
    <EmergencySection title="Contatos de emergência">
      <ul className="flex flex-col gap-3">
        {record.contacts.map((contact) => (
          <li key={contact.id} className="flex flex-col gap-2">
            <p className="text-xl font-medium break-words">
              {contact.name}
              <span className="block text-base font-normal text-muted-foreground">
                {contact.relationship} · {formatPhone(contact.phone)}
              </span>
            </p>
            <a
              href={phoneHref(contact.phone)}
              aria-label={`Ligar para ${contact.name}`}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-primary px-5 text-lg font-semibold text-primary-foreground"
            >
              <Phone className="size-5" aria-hidden />
              Ligar
            </a>
          </li>
        ))}
      </ul>
    </EmergencySection>
  );
}

function CoverageSection({ record }: { record: HealthRecord }) {
  const { healthPlanName, healthPlanNumber, preferredHospital } = record.profile;
  if (!healthPlanName && !healthPlanNumber && !preferredHospital) return null;

  return (
    <EmergencySection title="Plano e hospital">
      <div className="flex flex-col gap-1 text-xl font-medium break-words">
        {healthPlanName ? <p>{healthPlanName}</p> : null}
        {healthPlanNumber ? <p>Nº {healthPlanNumber}</p> : null}
        {preferredHospital ? <p>{preferredHospital}</p> : null}
      </div>
    </EmergencySection>
  );
}

function isRecordEmpty(record: HealthRecord): boolean {
  const { profile } = record;
  return (
    profile.bloodType === 'unknown' &&
    !profile.healthPlanName &&
    !profile.healthPlanNumber &&
    !profile.preferredHospital &&
    record.allergies.length === 0 &&
    record.medications.length === 0 &&
    record.conditions.length === 0 &&
    record.contacts.length === 0
  );
}

export function EmergencyScreen({ memberId }: { memberId: string }) {
  const record = useHealthRecord(memberId);

  if (record.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (record.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar a ficha"
        description="Tente de novo."
        onRetry={() => void record.refetch()}
      />
    );
  }

  const data = record.data;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex flex-col gap-3">
        <Link
          href={`/app/health/${memberId}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Ficha completa
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Emergência: {data.memberName}</h1>
      </header>

      {isRecordEmpty(data) ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-xl font-medium">Ficha ainda vazia</p>
          <Link
            href={`/app/health/${memberId}`}
            className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-primary"
          >
            Preencher a ficha
          </Link>
        </div>
      ) : (
        <>
          <BloodTypeSection record={data} />
          <AllergiesSection record={data} />
          <MedicationsSection record={data} />
          <ConditionsSection record={data} />
          <ContactsSection record={data} />
          <CoverageSection record={data} />
        </>
      )}
    </div>
  );
}
