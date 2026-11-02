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
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createListItemRequestSchema,
  createListRequestSchema,
  updateListItemRequestSchema,
  updateListRequestSchema,
  type CreateListItemRequest,
  type CreateListRequest,
  type UpdateListItemRequest,
  type UpdateListRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { ListsService } from './lists.service';

@ApiTags('lists')
@ApiCookieAuth('access_token')
@Controller('lists')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar listas do casal, da atividade mais recente para a mais antiga' })
  @ApiResponse({ status: 200, description: 'Resumos das listas' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async list(@CurrentMember() member: CurrentMemberContext) {
    return this.listsService.list(member);
  }

  @Post()
  @ApiOperation({ summary: 'Criar lista' })
  @ApiResponse({ status: 201, description: 'Lista criada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async create(
    @Body(new ZodValidationPipe(createListRequestSchema)) body: CreateListRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.create(member, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar lista com itens' })
  @ApiResponse({ status: 200, description: 'Lista com itens' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND' })
  async get(@Param('id') listId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.listsService.get(member, listId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomear lista' })
  @ApiResponse({ status: 200, description: 'Lista renomeada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND' })
  async rename(
    @Param('id') listId: string,
    @Body(new ZodValidationPipe(updateListRequestSchema)) body: UpdateListRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.rename(member, listId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir lista' })
  @ApiResponse({ status: 204, description: 'Lista excluída' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND' })
  async remove(@Param('id') listId: string, @CurrentMember() member: CurrentMemberContext) {
    await this.listsService.remove(member, listId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Adicionar item' })
  @ApiResponse({ status: 201, description: 'Item criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND' })
  async addItem(
    @Param('id') listId: string,
    @Body(new ZodValidationPipe(createListItemRequestSchema)) body: CreateListItemRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.addItem(member, listId, body);
  }

  // Declarada antes de `items/:itemId`: o Nest casa por ordem e "checked" seria lido como :itemId.
  @Delete(':id/items/checked')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir os itens marcados' })
  @ApiResponse({ status: 204, description: 'Itens marcados excluídos' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND' })
  async clearChecked(@Param('id') listId: string, @CurrentMember() member: CurrentMemberContext) {
    await this.listsService.clearChecked(member, listId);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Editar título do item' })
  @ApiResponse({ status: 200, description: 'Item atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND ou LIST_ITEM_NOT_FOUND' })
  async editItem(
    @Param('id') listId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateListItemRequestSchema)) body: UpdateListItemRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.editItem(member, listId, itemId, body);
  }

  @Post(':id/items/:itemId/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar item (idempotente)' })
  @ApiResponse({ status: 200, description: 'Item marcado' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND ou LIST_ITEM_NOT_FOUND' })
  async checkItem(
    @Param('id') listId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.checkItem(member, listId, itemId);
  }

  @Post(':id/items/:itemId/uncheck')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desmarcar item (idempotente)' })
  @ApiResponse({ status: 200, description: 'Item desmarcado' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND ou LIST_ITEM_NOT_FOUND' })
  async uncheckItem(
    @Param('id') listId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.listsService.uncheckItem(member, listId, itemId);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir item' })
  @ApiResponse({ status: 204, description: 'Item excluído' })
  @ApiResponse({ status: 404, description: 'LIST_NOT_FOUND ou LIST_ITEM_NOT_FOUND' })
  async removeItem(
    @Param('id') listId: string,
    @Param('itemId') itemId: string,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    await this.listsService.removeItem(member, listId, itemId);
  }
}
