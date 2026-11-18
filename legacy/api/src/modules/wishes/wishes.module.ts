import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { CoupleModule } from '../couple/couple.module';
import { LinkPreviewModule } from '../link-preview/link-preview.module';
import { WishesController } from './wishes.controller';
import { WishesRepository } from './wishes.repository';
import { WishesService } from './wishes.service';

@Module({
  imports: [CoupleModule, AgendaModule, LinkPreviewModule],
  controllers: [WishesController],
  providers: [CoupleMemberGuard, WishesRepository, WishesService],
})
export class WishesModule {}
