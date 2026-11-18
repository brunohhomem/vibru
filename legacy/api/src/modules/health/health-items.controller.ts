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
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createAllergyRequestSchema,
  createDoctorRequestSchema,
  createEmergencyContactRequestSchema,
  createHealthConditionRequestSchema,
  createHealthEventRequestSchema,
  updateAllergyRequestSchema,
  updateDoctorRequestSchema,
  updateEmergencyContactRequestSchema,
  updateHealthConditionRequestSchema,
  updateHealthEventRequestSchema,
  type CreateAllergyRequest,
  type CreateDoctorRequest,
  type CreateEmergencyContactRequest,
  type CreateHealthConditionRequest,
  type CreateHealthEventRequest,
  type UpdateAllergyRequest,
  type UpdateDoctorRequest,
  type UpdateEmergencyContactRequest,
  type UpdateHealthConditionRequest,
  type UpdateHealthEventRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { AllergiesService } from './allergies.service';
import { DoctorsService } from './doctors.service';
import { EmergencyContactsService } from './emergency-contacts.service';
import { HealthConditionsService } from './health-conditions.service';
import { HealthEventsService } from './health-events.service';

/** Alergias, condições, contatos de emergência, médicos e histórico de um membro. */
@ApiTags('health')
@ApiCookieAuth('access_token')
@Controller('health/members/:memberId')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
@ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
@ApiResponse({ status: 404, description: 'HEALTH_MEMBER_NOT_FOUND ou HEALTH_ITEM_NOT_FOUND' })
export class HealthItemsController {
  constructor(
    private readonly allergiesService: AllergiesService,
    private readonly conditionsService: HealthConditionsService,
    private readonly contactsService: EmergencyContactsService,
    private readonly doctorsService: DoctorsService,
    private readonly eventsService: HealthEventsService,
  ) {}

  @Post('allergies')
  async createAllergy(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createAllergyRequestSchema)) body: CreateAllergyRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.allergiesService.create(member, memberId, body);
  }

  @Patch('allergies/:itemId')
  async updateAllergy(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateAllergyRequestSchema)) body: UpdateAllergyRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.allergiesService.update(member, memberId, itemId, body);
  }

  @Delete('allergies/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllergy(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.allergiesService.remove(member, memberId, itemId);
  }

  @Post('conditions')
  async createCondition(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createHealthConditionRequestSchema))
    body: CreateHealthConditionRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.conditionsService.create(member, memberId, body);
  }

  @Patch('conditions/:itemId')
  async updateCondition(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateHealthConditionRequestSchema))
    body: UpdateHealthConditionRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.conditionsService.update(member, memberId, itemId, body);
  }

  @Delete('conditions/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCondition(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.conditionsService.remove(member, memberId, itemId);
  }

  @Post('contacts')
  async createContact(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createEmergencyContactRequestSchema))
    body: CreateEmergencyContactRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.contactsService.create(member, memberId, body);
  }

  @Patch('contacts/:itemId')
  async updateContact(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateEmergencyContactRequestSchema))
    body: UpdateEmergencyContactRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.contactsService.update(member, memberId, itemId, body);
  }

  @Delete('contacts/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeContact(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.contactsService.remove(member, memberId, itemId);
  }

  @Post('doctors')
  async createDoctor(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createDoctorRequestSchema)) body: CreateDoctorRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.doctorsService.create(member, memberId, body);
  }

  @Patch('doctors/:itemId')
  async updateDoctor(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateDoctorRequestSchema)) body: UpdateDoctorRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.doctorsService.update(member, memberId, itemId, body);
  }

  @Delete('doctors/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDoctor(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.doctorsService.remove(member, memberId, itemId);
  }

  @Post('events')
  async createEvent(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(createHealthEventRequestSchema)) body: CreateHealthEventRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.eventsService.create(member, memberId, body);
  }

  @Patch('events/:itemId')
  async updateEvent(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateHealthEventRequestSchema)) body: UpdateHealthEventRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.eventsService.update(member, memberId, itemId, body);
  }

  @Delete('events/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(
    @Param('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.eventsService.remove(member, memberId, itemId);
  }
}
