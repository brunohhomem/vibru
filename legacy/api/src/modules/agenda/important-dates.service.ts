import { Injectable } from '@nestjs/common';
import type {
  CreateImportantDateRequest,
  ImportantDate,
  UpdateImportantDateRequest,
} from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { isUuid } from '../health/health.errors';
import { agendaItemNotFound } from './agenda.errors';
import { toImportantDate } from './agenda.mappers';
import { ImportantDatesRepository } from './important-dates.repository';

@Injectable()
export class ImportantDatesService {
  constructor(private readonly repository: ImportantDatesRepository) {}

  async create(
    member: CurrentMemberContext,
    data: CreateImportantDateRequest,
  ): Promise<ImportantDate> {
    const row = await this.repository.create({ ...data, coupleId: member.coupleId });
    return toImportantDate(row);
  }

  async update(
    member: CurrentMemberContext,
    dateId: string,
    data: UpdateImportantDateRequest,
  ): Promise<ImportantDate> {
    await this.requireDate(member.coupleId, dateId);

    const row = await this.repository.update(member.coupleId, dateId, data);
    return toImportantDate(row);
  }

  async remove(member: CurrentMemberContext, dateId: string): Promise<void> {
    await this.requireDate(member.coupleId, dateId);

    const deleted = await this.repository.softDelete(member.coupleId, dateId);
    if (!deleted) throw agendaItemNotFound();
  }

  private async requireDate(coupleId: string, dateId: string): Promise<void> {
    if (!isUuid(dateId)) throw agendaItemNotFound();

    const row = await this.repository.findActive(coupleId, dateId);
    if (!row) throw agendaItemNotFound();
  }
}
