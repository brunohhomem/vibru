import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  updateCoupleRequestSchema,
  updateMyMemberRequestSchema,
  type UpdateCoupleRequest,
  type UpdateMyMemberRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from './couple-member.guard';
import { CoupleService } from './couple.service';
import { CurrentMember, type CurrentMemberContext } from './decorators/current-member.decorator';
import { RequiresCouple } from './decorators/requires-couple.decorator';

@ApiTags('couple')
@ApiCookieAuth('access_token')
@Controller('couple')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Get()
  @ApiOperation({ summary: 'Obter o casal do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Casal, membros e datas calculadas' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async getCouple(@CurrentMember() member: CurrentMemberContext) {
    return this.coupleService.getCouple(member);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar as datas do casal' })
  @ApiResponse({ status: 200, description: 'Casal atualizado' })
  @ApiResponse({ status: 400, description: 'COUPLE_DATES_INVALID' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async updateCouple(
    @Body(new ZodValidationPipe(updateCoupleRequestSchema)) body: UpdateCoupleRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.coupleService.updateCouple(member, body);
  }

  @Patch('members/me')
  @ApiOperation({ summary: 'Atualizar o próprio nome dentro do casal' })
  @ApiResponse({ status: 200, description: 'Nome atualizado' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async updateMyMember(
    @Body(new ZodValidationPipe(updateMyMemberRequestSchema)) body: UpdateMyMemberRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.coupleService.updateMyMember(member, body);
  }
}
