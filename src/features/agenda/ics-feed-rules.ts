import { createHash, randomBytes } from 'node:crypto';
import type { CalendarEntries } from './agenda-entries';
import type { IcsEntry } from './ics-calendar';

const TOKEN_BYTES = 32;
const FEED_FILE_PATTERN = /^([A-Za-z0-9_-]{43})\.ics$/;

export function generateFeedToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** O banco guarda só o hash: a URL do feed é a credencial. */
export function hashFeedToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Token do nome de arquivo `<token>.ics`, ou nulo quando o formato não bate. */
export function parseFeedFile(feedFile: string): string | null {
  return FEED_FILE_PATTERN.exec(feedFile)?.[1] ?? null;
}

/** Sem RRULE: o nome das bodas muda a cada ano e o 29/02 tem regra própria. */
export function toIcsEntries(entries: CalendarEntries, coupleId: string): IcsEntry[] {
  return [
    // As observações ficam de fora: o feed é sincronizado em serviços de terceiros.
    ...entries.events.map((event) => ({
      uid: `event-${event.id}@vibru`,
      title: event.title,
      date: event.startsOn,
      time: event.startTime,
    })),
    ...entries.importantDates.map((date) => ({
      uid: `date-${date.id}-${date.date}@vibru`,
      title: date.title,
      date: date.date,
      time: null,
    })),
    ...entries.anniversaries.map((anniversary) => ({
      uid: `${anniversary.kind}-${coupleId}-${anniversary.date}@vibru`,
      title: anniversary.title,
      date: anniversary.date,
      time: null,
    })),
  ];
}
