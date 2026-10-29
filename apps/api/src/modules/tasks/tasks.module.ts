import { Module } from '@nestjs/common';
import { CoupleModule } from '../couple/couple.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [CoupleModule],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService, CoupleMemberGuard],
})
export class TasksModule {}
