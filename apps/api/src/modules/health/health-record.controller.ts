import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { updateHealthProfileRequestSchema, type UpdateHealthProfileRequest } from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { HealthProfileService } from './health-profile.service';
import { HealthRecordService } from './health-record.service';

@ApiTags('health')
@ApiCookieAuth('access_token')
@Controller('health/members/:memberId')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
export class HealthRecordController {
  constructor(
    private readonly recordService: HealthRecordService,
    private readonly profileService: HealthProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Ficha de saúde completa de um membro' })
  @ApiResponse({ status: 200, description: 'Ficha do membro' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'HEALTH_MEMBER_NOT_FOUND' })
  async get(@Param('memberId') memberId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.recordService.get(member, memberId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Salvar o perfil de saúde (tipo sanguíneo, plano, hospital)' })
  @ApiResponse({ status: 200, description: 'Perfil salvo' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'HEALTH_MEMBER_NOT_FOUND' })
  async saveProfile(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateHealthProfileRequestSchema))
    body: UpdateHealthProfileRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.profileService.save(member, memberId, body);
  }
}
