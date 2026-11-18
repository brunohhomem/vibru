import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('test')
@Controller('test')
export class TestThrottlerController {
  @Get('throttle')
  @ApiResponse({ status: 200, description: 'Endpoint para testar throttler default' })
  async testThrottle() {
    return { ok: true };
  }
}
