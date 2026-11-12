import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  parseCalendarDate,
  todayInSaoPaulo,
  type IcsFeedCreated,
  type IcsFeedStatus,
} from '@vibru/shared';
import { CoupleRepository } from '../couple/couple.repository';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { AgendaCalendarService, type CalendarEntries } from './agenda-calendar.service';
import { icsFeedNotFound } from './agenda.errors';
import { buildIcsCalendar, type IcsEntry } from './ics-calendar';

const TOKEN_BYTES = 32;
const FEED_FILE_PATTERN = /^([A-Za-z0-9_-]{43})\.ics$/;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Sem RRULE: o nome das bodas muda a cada ano e o 29/02 tem regra própria. */
function toIcsEntries(entries: CalendarEntries, coupleId: string): IcsEntry[] {
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

@Injectable()
export class IcsFeedService {
  constructor(
    private readonly coupleRepository: CoupleRepository,
    private readonly calendarService: AgendaCalendarService,
  ) {}

  async getStatus(member: CurrentMemberContext): Promise<IcsFeedStatus> {
    const row = await this.coupleRepository.findMember(member.coupleId, member.memberId);
    return { active: Boolean(row?.icsTokenHash) };
  }

  /** Trocar o hash invalida o token anterior na mesma escrita. */
  async regenerate(member: CurrentMemberContext): Promise<IcsFeedCreated> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await this.coupleRepository.updateMemberIcsTokenHash(
      member.coupleId,
      member.memberId,
      hashToken(token),
    );

    return { feedPath: `/api/ics/${token}.ics` };
  }

  async revoke(member: CurrentMemberContext): Promise<void> {
    await this.coupleRepository.updateMemberIcsTokenHash(member.coupleId, member.memberId, null);
  }

  async render(feedFile: string): Promise<string> {
    const token = FEED_FILE_PATTERN.exec(feedFile)?.[1];
    if (!token) throw icsFeedNotFound();

    const member = await this.coupleRepository.findMemberByIcsTokenHash(hashToken(token));
    if (!member) throw icsFeedNotFound();

    const now = new Date();
    const { year } = parseCalendarDate(todayInSaoPaulo(now));
    const entries = await this.calendarService.listBetween(member.coupleId, {
      from: `${year - 1}-01-01`,
      to: `${year + 2}-12-31`,
    });

    return buildIcsCalendar(toIcsEntries(entries, member.coupleId), now);
  }
}
