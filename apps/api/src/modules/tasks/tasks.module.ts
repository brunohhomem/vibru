import { Module } from '@nestjs/common';
import { CoupleModule } from '../couple/couple.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { MedicationsModule } from '../medications/medications.module';
import { MedicationTasksService } from './medication-tasks.service';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [CoupleModule, MedicationsModule],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService, MedicationTasksService, CoupleMemberGuard],
  exports: [MedicationTasksService],
})
export class TasksModule {}
