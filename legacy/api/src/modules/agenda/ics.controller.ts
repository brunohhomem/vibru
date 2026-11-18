import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { IcsFeedService } from './ics-feed.service';

@ApiTags('agenda')
@Controller('ics')
export class IcsController {
  constructor(private readonly feedService: IcsFeedService) {}

  // Calendário externo não envia cookie; a credencial é o token da URL (ADR 0003, 4.3).
  @Public()
  @Get(':feedFile')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @ApiResponse({ status: 200, description: 'Feed ICS do casal' })
  @ApiResponse({ status: 404, description: 'ICS_FEED_NOT_FOUND' })
  async getFeed(@Param('feedFile') feedFile: string) {
    return this.feedService.render(feedFile);
  }
}
