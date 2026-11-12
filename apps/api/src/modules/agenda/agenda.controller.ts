import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  agendaMonthSchema,
  createAgendaEventRequestSchema,
  createImportantDateRequestSchema,
  updateAgendaEventRequestSchema,
  updateImportantDateRequestSchema,
  type CreateAgendaEventRequest,
  type CreateImportantDateRequest,
  type UpdateAgendaEventRequest,
  type UpdateImportantDateRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { AgendaCalendarService } from './agenda-calendar.service';
import { AgendaEventsService } from './agenda-events.service';
import { IcsFeedService } from './ics-feed.service';
import { ImportantDatesService } from './important-dates.service';

@ApiTags('agenda')
@ApiCookieAuth('access_token')
@Controller('agenda')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
@ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
export class AgendaController {
  constructor(
    private readonly calendarService: AgendaCalendarService,
    private readonly eventsService: AgendaEventsService,
    private readonly importantDatesService: ImportantDatesService,
    private readonly feedService: IcsFeedService,
  ) {}

  @Get()
  async getMonth(
    @Query('month', new ZodValidationPipe(agendaMonthSchema)) month: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.calendarService.getMonth(member, month);
  }

  @Get('upcoming')
  async getUpcoming(@CurrentMember() member: CurrentMemberContext) {
    return this.calendarService.getUpcoming(member);
  }

  @Post('events')
  async createEvent(
    @Body(new ZodValidationPipe(createAgendaEventRequestSchema)) body: CreateAgendaEventRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.eventsService.create(member, body);
  }

  @Patch('events/:eventId')
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateAgendaEventRequestSchema)) body: UpdateAgendaEventRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.eventsService.update(member, eventId, body);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(
    @Param('eventId') eventId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.eventsService.remove(member, eventId);
  }

  @Post('important-dates')
  async createImportantDate(
    @Body(new ZodValidationPipe(createImportantDateRequestSchema))
    body: CreateImportantDateRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.importantDatesService.create(member, body);
  }

  @Patch('important-dates/:dateId')
  async updateImportantDate(
    @Param('dateId') dateId: string,
    @Body(new ZodValidationPipe(updateImportantDateRequestSchema))
    body: UpdateImportantDateRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.importantDatesService.update(member, dateId, body);
  }

  @Delete('important-dates/:dateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeImportantDate(
    @Param('dateId') dateId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.importantDatesService.remove(member, dateId);
  }

  @Get('ics')
  async getFeedStatus(@CurrentMember() member: CurrentMemberContext) {
    return this.feedService.getStatus(member);
  }

  @Post('ics')
  async regenerateFeed(@CurrentMember() member: CurrentMemberContext) {
    return this.feedService.regenerate(member);
  }

  @Delete('ics')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeFeed(@CurrentMember() member: CurrentMemberContext) {
    await this.feedService.revoke(member);
  }
}
