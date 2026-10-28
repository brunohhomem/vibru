import { Module } from '@nestjs/common';
import { CoupleMemberGuard } from './couple-member.guard';
import { CoupleController } from './couple.controller';
import { CoupleRepository } from './couple.repository';
import { CoupleService } from './couple.service';

@Module({
  controllers: [CoupleController],
  providers: [CoupleRepository, CoupleService, CoupleMemberGuard],
  exports: [CoupleRepository],
})
export class CoupleModule {}
