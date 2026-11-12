import { Module } from '@nestjs/common';
import { OgImageService } from './og-image.service';

@Module({
  providers: [{ provide: OgImageService, useFactory: () => new OgImageService() }],
  exports: [OgImageService],
})
export class LinkPreviewModule {}
