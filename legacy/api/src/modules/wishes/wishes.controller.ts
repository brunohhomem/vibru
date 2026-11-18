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
  createWishRequestSchema,
  planWishRequestSchema,
  updateWishRequestSchema,
  wishStatusSchema,
  type CreateWishRequest,
  type PlanWishRequest,
  type UpdateWishRequest,
  type WishStatus,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { WishesService } from './wishes.service';

@ApiTags('wishes')
@ApiCookieAuth('access_token')
@Controller('wishes')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
@ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
@ApiResponse({ status: 404, description: 'WISH_NOT_FOUND' })
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get()
  async list(
    @Query('status', new ZodValidationPipe(wishStatusSchema)) status: WishStatus,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.wishesService.list(member, status);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createWishRequestSchema)) body: CreateWishRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.wishesService.create(member, body);
  }

  @Patch(':wishId')
  async update(
    @Param('wishId') wishId: string,
    @Body(new ZodValidationPipe(updateWishRequestSchema)) body: UpdateWishRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.wishesService.update(member, wishId, body);
  }

  @Delete(':wishId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('wishId') wishId: string, @CurrentMember() member: CurrentMemberContext) {
    await this.wishesService.remove(member, wishId);
  }

  @Post(':wishId/done')
  @HttpCode(HttpStatus.OK)
  async markDone(@Param('wishId') wishId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.wishesService.setDone(member, wishId, true);
  }

  @Delete(':wishId/done')
  async unmarkDone(@Param('wishId') wishId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.wishesService.setDone(member, wishId, false);
  }

  @Post(':wishId/plan')
  async plan(
    @Param('wishId') wishId: string,
    @Body(new ZodValidationPipe(planWishRequestSchema)) body: PlanWishRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.wishesService.plan(member, wishId, body);
  }
}
