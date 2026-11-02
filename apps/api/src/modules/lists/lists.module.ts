import { Module } from '@nestjs/common';
import { CoupleModule } from '../couple/couple.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { ListsController } from './lists.controller';
import { ListsRepository } from './lists.repository';
import { ListsService } from './lists.service';
import { NamedListService } from './named-list.service';

@Module({
  imports: [CoupleModule],
  controllers: [ListsController],
  providers: [ListsRepository, ListsService, NamedListService, CoupleMemberGuard],
  exports: [NamedListService],
})
export class ListsModule {}
