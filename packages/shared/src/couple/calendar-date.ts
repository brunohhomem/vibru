/**
 * Data de calendário no formato `YYYY-MM-DD`, sem fuso.
 *
 * É o formato que o Postgres devolve para colunas `date` com `mode: 'string'`
 * e o que o `Intl` usa para a data civil de São Paulo.
 */
export type CalendarDate = string;

export type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

export type ElapsedParts = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
};

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Data civil de hoje em `America/Sao_Paulo`.
 *
 * `toISOString()` usa UTC e erra o dia entre 21h e 0h em São Paulo, por isso a
 * conversão passa pelo `Intl` com o fuso fixo.
 */
export function todayInSaoPaulo(now: Date): CalendarDate {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const year = readPart(parts, 'year');
  const month = readPart(parts, 'month');
  const day = readPart(parts, 'day');

  return `${year}-${month}-${day}`;
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const part = parts.find((item) => item.type === type);
  if (!part) throw new Error(`Data de São Paulo sem a parte ${type}`);
  return part.value;
}

export function parseCalendarDate(date: CalendarDate): CalendarDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Data de calendário inválida: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) throw new Error(`Mês inválido em ${date}`);
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`Dia inválido em ${date}`);

  return { year, month, day };
}

export function formatCalendarDate(parts: CalendarDateParts): CalendarDate {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${String(parts.year).padStart(4, '0')}-${month}-${day}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

/**
 * Diferença em dias civis entre duas datas, sem fuso.
 *
 * As duas datas são traduzidas para UTC antes da subtração; assim o horário de
 * verão não altera a contagem.
 */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const start = Date.UTC(...toUtcTuple(from));
  const end = Date.UTC(...toUtcTuple(to));
  return Math.round((end - start) / MILLISECONDS_PER_DAY);
}

function toUtcTuple(date: CalendarDate): [number, number, number] {
  const { year, month, day } = parseCalendarDate(date);
  return [year, month - 1, day];
}

/**
 * Anos, meses e dias completos entre duas datas civis.
 *
 * Quando `from` está no futuro, o período decorrido é zero.
 */
export function elapsedParts(from: CalendarDate, today: CalendarDate): ElapsedParts {
  const totalDays = daysBetween(from, today);
  if (totalDays <= 0) return { years: 0, months: 0, days: 0, totalDays: 0 };

  const start = parseCalendarDate(from);
  const end = parseCalendarDate(today);

  let years = end.year - start.year;
  let months = end.month - start.month;
  let days = end.day - start.day;

  if (days < 0) {
    months -= 1;
    const previousMonth = end.month === 1 ? 12 : end.month - 1;
    const previousMonthYear = end.month === 1 ? end.year - 1 : end.year;
    const anchorDay = Math.min(start.day, daysInMonth(previousMonthYear, previousMonth));
    days = daysBetween(
      formatCalendarDate({ year: previousMonthYear, month: previousMonth, day: anchorDay }),
      today,
    );
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, totalDays };
}

/**
 * Próxima ocorrência anual de uma data, contando hoje como a próxima.
 *
 * 29/02 cai em 28/02 nos anos não bissextos (ADR 0003, seção 3).
 */
export function nextAnnualOccurrence(date: CalendarDate, today: CalendarDate): CalendarDate {
  const occurrence = parseCalendarDate(date);
  const current = parseCalendarDate(today);

  const thisYear = occurrenceForYear(occurrence, current.year);
  if (thisYear >= today) return thisYear;

  return occurrenceForYear(occurrence, current.year + 1);
}

function occurrenceForYear(occurrence: CalendarDateParts, year: number): CalendarDate {
  const day =
    occurrence.month === 2 && occurrence.day === 29 && !isLeapYear(year) ? 28 : occurrence.day;
  return formatCalendarDate({ year, month: occurrence.month, day });
}
