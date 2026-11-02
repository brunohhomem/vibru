'use client';

import type { Allergy, Doctor, EmergencyContact, HealthCondition, Medication } from '@vibru/shared';
import { ArrowLeft, Siren } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorState } from '@/components/ui/screen-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useHealthRecord } from '../hooks/use-health';
import { AllergySheet } from './allergy-sheet.client';
import { ConditionSheet } from './condition-sheet.client';
import { ContactSheet } from './contact-sheet.client';
import { DoctorSheet } from './doctor-sheet.client';
import {
  AllergiesSection,
  ConditionsSection,
  ContactsSection,
  DoctorsSection,
  MedicationsSection,
  ProfileSection,
} from './health-sections';
import { MedicationSheet } from './medication-sheet.client';
import { ProfileSheet } from './profile-sheet.client';

type Editor =
  | { kind: 'profile' }
  | { kind: 'allergy'; item: Allergy | null }
  | { kind: 'condition'; item: HealthCondition | null }
  | { kind: 'contact'; item: EmergencyContact | null }
  | { kind: 'doctor'; item: Doctor | null }
  | { kind: 'medication'; item: Medication | null };

function RecordSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

export function HealthRecordScreen({ memberId }: { memberId: string }) {
  const record = useHealthRecord(memberId);
  const [editor, setEditor] = useState<Editor>({ kind: 'profile' });
  const [open, setOpen] = useState(false);

  if (record.isPending) return <RecordSkeleton />;

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

  function edit(next: Editor) {
    setEditor(next);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/app/health"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Saúde
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Ficha de {data.memberName}</h1>
          <Link
            href={`/app/health/${memberId}/emergency`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-primary-foreground"
          >
            <Siren className="size-4" aria-hidden />
            Modo emergência
          </Link>
        </div>
      </header>

      <ProfileSection profile={data.profile} onEdit={() => edit({ kind: 'profile' })} />
      <AllergiesSection
        items={data.allergies}
        onAdd={() => edit({ kind: 'allergy', item: null })}
        onEdit={(item) => edit({ kind: 'allergy', item })}
      />
      <ConditionsSection
        items={data.conditions}
        onAdd={() => edit({ kind: 'condition', item: null })}
        onEdit={(item) => edit({ kind: 'condition', item })}
      />
      <ContactsSection
        items={data.contacts}
        onAdd={() => edit({ kind: 'contact', item: null })}
        onEdit={(item) => edit({ kind: 'contact', item })}
      />
      <DoctorsSection
        items={data.doctors}
        onAdd={() => edit({ kind: 'doctor', item: null })}
        onEdit={(item) => edit({ kind: 'doctor', item })}
      />
      <MedicationsSection
        items={data.medications}
        onAdd={() => edit({ kind: 'medication', item: null })}
        onEdit={(item) => edit({ kind: 'medication', item })}
      />

      <ProfileSheet
        memberId={memberId}
        open={open && editor.kind === 'profile'}
        profile={data.profile}
        onOpenChange={setOpen}
      />
      <AllergySheet
        memberId={memberId}
        open={open && editor.kind === 'allergy'}
        allergy={editor.kind === 'allergy' ? editor.item : null}
        onOpenChange={setOpen}
      />
      <ConditionSheet
        memberId={memberId}
        open={open && editor.kind === 'condition'}
        condition={editor.kind === 'condition' ? editor.item : null}
        onOpenChange={setOpen}
      />
      <ContactSheet
        memberId={memberId}
        open={open && editor.kind === 'contact'}
        contact={editor.kind === 'contact' ? editor.item : null}
        onOpenChange={setOpen}
      />
      <DoctorSheet
        memberId={memberId}
        open={open && editor.kind === 'doctor'}
        doctor={editor.kind === 'doctor' ? editor.item : null}
        onOpenChange={setOpen}
      />
      <MedicationSheet
        memberId={memberId}
        open={open && editor.kind === 'medication'}
        medication={editor.kind === 'medication' ? editor.item : null}
        onOpenChange={setOpen}
      />
    </div>
  );
}
