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
  createTaskRequestSchema,
  updateTaskRequestSchema,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from '@vibru/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import {
  CurrentMember,
  type CurrentMemberContext,
} from '../couple/decorators/current-member.decorator';
import { RequiresCouple } from '../couple/decorators/requires-couple.decorator';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiCookieAuth('access_token')
@Controller('tasks')
@RequiresCouple()
@UseGuards(CoupleMemberGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tarefas abertas e concluídas desta semana' })
  @ApiResponse({ status: 200, description: 'Tarefas do casal' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async list(@CurrentMember() member: CurrentMemberContext) {
    return this.tasksService.list(member);
  }

  @Post()
  @ApiOperation({ summary: 'Criar tarefa' })
  @ApiResponse({ status: 201, description: 'Tarefa criada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou responsável de outro casal' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  async create(
    @Body(new ZodValidationPipe(createTaskRequestSchema)) body: CreateTaskRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.tasksService.create(member, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa atualizada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou recorrência sem prazo' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  async update(
    @Param('id') taskId: string,
    @Body(new ZodValidationPipe(updateTaskRequestSchema)) body: UpdateTaskRequest,
    @CurrentMember() member: CurrentMemberContext,
  ) {
    return this.tasksService.update(member, taskId, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir tarefa (cria a próxima, se recorrente)' })
  @ApiResponse({ status: 200, description: 'Tarefa concluída e próxima ocorrência' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'TASK_ALREADY_COMPLETED' })
  async complete(@Param('id') taskId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.tasksService.complete(member, taskId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desfazer a conclusão de uma tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa reaberta' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'TASK_NOT_COMPLETED' })
  async reopen(@Param('id') taskId: string, @CurrentMember() member: CurrentMemberContext) {
    return this.tasksService.reopen(member, taskId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir tarefa' })
  @ApiResponse({ status: 204, description: 'Tarefa excluída' })
  @ApiResponse({ status: 403, description: 'COUPLE_REQUIRED' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  async remove(@Param('id') taskId: string, @CurrentMember() member: CurrentMemberContext) {
    await this.tasksService.remove(member, taskId);
  }
}
