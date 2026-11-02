import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { HealthMembersService } from './health-members.service';

@ApiTags('health')
@ApiCookieAuth('access_token')
@Controller('health/members')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
export class HealthMembersController {
  constructor(private readonly membersService: HealthMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar os membros do casal com a contagem de remédios' })
  @ApiResponse({ status: 200, description: 'Membros e contagem de remédios' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async list(@CurrentMember() member: CurrentMemberContext) {
    return this.membersService.list(member);
  }
}
