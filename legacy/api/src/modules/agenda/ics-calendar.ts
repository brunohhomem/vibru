import type { CalendarDate } from '@vibru/shared';

export type IcsEntry = {
  uid: string;
  title: string;
  date: CalendarDate;
  time: string | null;
};

const TIME_ZONE = 'America/Sao_Paulo';
const MAX_LINE_OCTETS = 75;

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** RFC 5545: linha de até 75 octetos; a continuação começa com um espaço. */
function foldLine(line: string): string {
  const folded: string[] = [];
  let current = '';

  for (const character of line) {
    if (Buffer.byteLength(current + character) > MAX_LINE_OCTETS) {
      folded.push(current);
      current = ' ';
    }
    current += character;
  }

  return [...folded, current].join('\r\n');
}

function compactDate(date: CalendarDate): string {
  return date.replace(/-/g, '');
}

function timestampUtc(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function startLines(entry: IcsEntry): string[] {
  if (!entry.time) return [`DTSTART;VALUE=DATE:${compactDate(entry.date)}`];

  const time = entry.time.replace(':', '');
  return [`DTSTART;TZID=${TIME_ZONE}:${compactDate(entry.date)}T${time}00`, 'DURATION:PT1H'];
}

function eventLines(entry: IcsEntry, stamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${entry.uid}`,
    `DTSTAMP:${stamp}`,
    ...startLines(entry),
    `SUMMARY:${escapeText(entry.title)}`,
    'END:VEVENT',
  ];
}

/** O Brasil não tem horário de verão desde 2019: um offset fixo descreve o fuso. */
const TIME_ZONE_LINES = [
  'BEGIN:VTIMEZONE',
  `TZID:${TIME_ZONE}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'TZNAME:-03',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildIcsCalendar(entries: IcsEntry[], now: Date): string {
  const stamp = timestampUtc(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vibru//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Vibru',
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    ...TIME_ZONE_LINES,
    ...entries.flatMap((entry) => eventLines(entry, stamp)),
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
