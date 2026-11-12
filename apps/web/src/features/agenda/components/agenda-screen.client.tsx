'use client';

import {
  todayInSaoPaulo,
  type AgendaEvent,
  type AgendaResponse,
  type CalendarDate,
  type ImportantDate,
} from '@vibru/shared';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { formatLongDate } from '@/features/home/lib/home-format';
import { cn } from '@/lib/cn';
import { useAgenda } from '../hooks/use-agenda';
import {
  agendaDays,
  monthGrid,
  monthLabel,
  shiftMonth,
  type AgendaDay,
  type AgendaEntry,
} from '../lib/agenda-calendar';
import { EventSheet } from './event-sheet.client';
import { ImportantDateSheet } from './important-date-sheet.client';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Editor =
  { kind: 'event'; item: AgendaEvent | null } | { kind: 'date'; item: ImportantDate | null };

function MonthGrid({ agenda, days }: { agenda: AgendaResponse; days: AgendaDay[] }) {
  const entriesByDate = new Map(days.map((day) => [day.date, day.entries]));

  return (
    <Card aria-hidden>
      <CardContent className="grid grid-cols-7 gap-1 py-3 text-center">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={index} className="text-xs text-muted-foreground">
            {initial}
          </span>
        ))}
        {monthGrid(agenda.month).map((date, index) =>
          date ? (
            <DayCell
              key={date}
              date={date}
              isToday={date === agenda.today}
              entries={entriesByDate.get(date) ?? []}
            />
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </CardContent>
    </Card>
  );
}

type DayCellProps = { date: CalendarDate; isToday: boolean; entries: AgendaEntry[] };

function DayCell({ date, isToday, entries }: DayCellProps) {
  return (
    <span
      className={cn(
        'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-sm',
        isToday && 'bg-primary font-semibold text-primary-foreground',
      )}
    >
      {Number(date.slice(8))}
      <span className="flex h-1.5 gap-0.5">
        {entries.slice(0, 3).map((entry) => (
          <span
            key={entry.key}
            className={cn(
              'size-1.5 rounded-full',
              entry.kind === 'event' ? 'bg-current' : 'bg-sand-foreground',
            )}
          />
        ))}
      </span>
    </span>
  );
}

type EntryRowProps = { entry: AgendaEntry; onEdit: (editor: Editor) => void };

function EntryRow({ entry, onEdit }: EntryRowProps) {
  if (entry.kind === 'anniversary') {
    return (
      <p className="flex min-h-11 items-center rounded-md bg-sand px-3 text-base font-medium text-sand-foreground">
        {entry.title}
      </p>
    );
  }

  const editor: Editor =
    entry.kind === 'event'
      ? { kind: 'event', item: entry.event }
      : { kind: 'date', item: entry.importantDate };

  return (
    <button
      type="button"
      aria-label={`Editar ${entry.title}`}
      onClick={() => onEdit(editor)}
      className={cn(
        'flex min-h-11 w-full items-center rounded-md px-3 text-left text-base font-medium hover:bg-accent',
        entry.kind === 'date' && 'bg-sand text-sand-foreground',
      )}
    >
      <span className="break-words">{entry.title}</span>
    </button>
  );
}

export function AgendaScreen() {
  const today = todayInSaoPaulo(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editor, setEditor] = useState<Editor>({ kind: 'event', item: null });
  const [open, setOpen] = useState(false);
  const agenda = useAgenda(month);

  function edit(next: Editor) {
    setEditor(next);
    setOpen(true);
  }

  const defaultDate = month === today.slice(0, 7) ? today : `${month}-01`;
  const days = agenda.data ? agendaDays(agenda.data) : [];

  return (
    <div className="flex w-full flex-col gap-4 pb-8 md:max-w-2xl">
      <PageHeader title="Agenda" />

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <h2 className="text-lg font-semibold first-letter:uppercase">{monthLabel(month)}</h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => edit({ kind: 'event', item: null })}>
          <Plus className="size-4" aria-hidden />
          Novo evento
        </Button>
        <Button type="button" variant="outline" onClick={() => edit({ kind: 'date', item: null })}>
          <CalendarPlus className="size-4" aria-hidden />
          Nova data
        </Button>
      </div>

      {agenda.isPending ? <LoadingState /> : null}
      {agenda.isError ? (
        <ErrorState
          title="Não foi possível carregar a agenda"
          description="Tente de novo."
          onRetry={() => void agenda.refetch()}
        />
      ) : null}

      {agenda.data ? <MonthGrid agenda={agenda.data} days={days} /> : null}

      {agenda.data && days.length === 0 ? (
        <EmptyState title="Nada marcado" description="Este mês ainda está livre." />
      ) : null}

      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-muted-foreground first-letter:uppercase">
            {formatLongDate(day.date)}
          </h3>
          {day.entries.map((entry) => (
            <EntryRow key={entry.key} entry={entry} onEdit={edit} />
          ))}
        </section>
      ))}

      <EventSheet
        open={open && editor.kind === 'event'}
        event={editor.kind === 'event' ? editor.item : null}
        defaultDate={defaultDate}
        onOpenChange={setOpen}
      />
      <ImportantDateSheet
        open={open && editor.kind === 'date'}
        importantDate={editor.kind === 'date' ? editor.item : null}
        defaultDate={defaultDate}
        onOpenChange={setOpen}
      />
    </div>
  );
}
