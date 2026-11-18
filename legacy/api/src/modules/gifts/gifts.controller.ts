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
  createGiftRequestSchema,
  giftStatusSchema,
  updateGiftRequestSchema,
  type CreateGiftRequest,
  type GiftStatus,
  type UpdateGiftRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { GiftsService } from './gifts.service';

/** Lista de presentes de um membro; a reserva some da resposta quando quem pede é o dono. */
@ApiTags('gifts')
@ApiCookieAuth('access_token')
@Controller('members/:memberId/gifts')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
@ApiResponse({ status: 403, description: 'COUPLE_REQUIRED ou GIFT_NOT_OWNER' })
@ApiResponse({ status: 404, description: 'GIFT_NOT_FOUND' })
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get()
  async list(
    @Param('memberId') ownerId: string,
    @Query('status', new ZodValidationPipe(giftStatusSchema)) status: GiftStatus,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.list(member, ownerId, status);
  }

  @Post()
  async create(
    @Param('memberId') ownerId: string,
    @Body(new ZodValidationPipe(createGiftRequestSchema)) body: CreateGiftRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.create(member, ownerId, body);
  }

  @Patch(':giftId')
  async update(
    @Param('memberId') ownerId: string,
    @Param('giftId') giftId: string,
    @Body(new ZodValidationPipe(updateGiftRequestSchema)) body: UpdateGiftRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.update(member, ownerId, giftId, body);
  }

  @Delete(':giftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('memberId') ownerId: string,
    @Param('giftId') giftId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.giftsService.remove(member, ownerId, giftId);
  }

  @Post(':giftId/received')
  @HttpCode(HttpStatus.OK)
  async markReceived(
    @Param('memberId') ownerId: string,
    @Param('giftId') giftId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.markReceived(member, ownerId, giftId);
  }

  @Post(':giftId/reservation')
  @ApiResponse({ status: 409, description: 'GIFT_ALREADY_RESERVED' })
  @ApiResponse({ status: 422, description: 'GIFT_SELF_RESERVATION' })
  async reserve(
    @Param('memberId') ownerId: string,
    @Param('giftId') giftId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.reserve(member, ownerId, giftId);
  }

  @Delete(':giftId/reservation')
  @ApiResponse({ status: 422, description: 'GIFT_SELF_RESERVATION' })
  async release(
    @Param('memberId') ownerId: string,
    @Param('giftId') giftId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.giftsService.release(member, ownerId, giftId);
  }
}
