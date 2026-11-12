import { Module } from '@nestjs/common';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { CoupleModule } from '../couple/couple.module';
import { LinkPreviewModule } from '../link-preview/link-preview.module';
import { GiftsController } from './gifts.controller';
import { GiftsRepository } from './gifts.repository';
import { GiftsService } from './gifts.service';

@Module({
  imports: [CoupleModule, LinkPreviewModule],
  controllers: [GiftsController],
  providers: [CoupleMemberGuard, GiftsRepository, GiftsService],
})
export class GiftsModule {}
