import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createMedicationRequestSchema,
  updateMedicationRequestSchema,
  type CreateMedicationRequest,
  type UpdateMedicationRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { MedicationLifecycleService } from './medication-lifecycle.service';
import { PharmacyService } from './pharmacy.service';

@ApiTags('health')
@ApiCookieAuth('access_token')
@Controller('health')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
@ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
export class MedicationsController {
  constructor(
    private readonly lifecycleService: MedicationLifecycleService,
    private readonly pharmacyService: PharmacyService,
  ) {}

  @Post('members/:memberId/medications')
  @ApiOperation({ summary: 'Criar remédio e as tarefas diárias dele' })
  @ApiResponse({ status: 201, description: 'Remédio criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'HEALTH_MEMBER_NOT_FOUND' })
  async create(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createMedicationRequestSchema)) body: CreateMedicationRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.lifecycleService.create(member, memberId, body);
  }

  @Patch('medications/:id')
  @ApiOperation({ summary: 'Editar remédio e sincronizar as tarefas' })
  @ApiResponse({ status: 200, description: 'Remédio atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'MEDICATION_NOT_FOUND' })
  async update(
    @Param('id') medicationId: string,
    @Body(new ZodValidationPipe(updateMedicationRequestSchema)) body: UpdateMedicationRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.lifecycleService.update(member, medicationId, body);
  }

  @Delete('medications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir remédio e as tarefas abertas dele' })
  @ApiResponse({ status: 204, description: 'Remédio excluído' })
  @ApiResponse({ status: 404, description: 'MEDICATION_NOT_FOUND' })
  async remove(@Param('id') medicationId: string, @CurrentMember() member: CurrentMemberContext) {
    await this.lifecycleService.remove(member, medicationId);
  }

  @Post('medications/:id/pharmacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adicionar o remédio à lista Farmácia' })
  @ApiResponse({ status: 200, description: 'Lista e item da Farmácia' })
  @ApiResponse({ status: 404, description: 'MEDICATION_NOT_FOUND' })
  async addToPharmacy(
    @Param('id') medicationId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.pharmacyService.addMedication(member, medicationId);
  }
}
