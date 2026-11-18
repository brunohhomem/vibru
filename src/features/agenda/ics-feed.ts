import { findMemberByIcsTokenHash } from '@/features/couple/couple-repository';
import { loadCalendarEntries } from './calendar-source';
import { buildIcsCalendar } from './ics-calendar';
import { hashFeedToken, parseFeedFile, toIcsEntries } from './ics-feed-rules';
import { parseCalendarDate, todayInSaoPaulo } from '@/lib/calendar-date';

/**
 * Calendário ICS do casal dono do token, ou nulo. Token inexistente, revogado ou
 * malformado respondem igual: quem pede não descobre qual dos três foi.
 */
export async function renderIcsFeed(
  feedFile: string,
  now: Date = new Date(),
): Promise<string | null> {
  const token = parseFeedFile(feedFile);
  if (!token) return null;

  const member = await findMemberByIcsTokenHash(hashFeedToken(token));
  if (!member) return null;

  const { year } = parseCalendarDate(todayInSaoPaulo(now));
  const entries = await loadCalendarEntries(member.coupleId, {
    from: `${year - 1}-01-01`,
    to: `${year + 2}-12-31`,
  });

  return buildIcsCalendar(toIcsEntries(entries, member.coupleId), now);
}
