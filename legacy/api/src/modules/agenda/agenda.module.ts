import { Module } from '@nestjs/common';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { CoupleModule } from '../couple/couple.module';
import { AgendaCalendarService } from './agenda-calendar.service';
import { AgendaEventsRepository } from './agenda-events.repository';
import { AgendaEventsService } from './agenda-events.service';
import { AgendaController } from './agenda.controller';
import { IcsFeedService } from './ics-feed.service';
import { IcsController } from './ics.controller';
import { ImportantDatesRepository } from './important-dates.repository';
import { ImportantDatesService } from './important-dates.service';

@Module({
  imports: [CoupleModule],
  controllers: [AgendaController, IcsController],
  providers: [
    CoupleMemberGuard,
    AgendaCalendarService,
    AgendaEventsRepository,
    AgendaEventsService,
    ImportantDatesRepository,
    ImportantDatesService,
    IcsFeedService,
  ],
  exports: [AgendaEventsService],
})
export class AgendaModule {}
