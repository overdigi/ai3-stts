import { Module } from '@nestjs/common';
import { HeygenDirectController } from './heygen-direct.controller';
import { HeygenDirectService } from './heygen-direct.service';
import { HeygenDirectCleanupService } from './heygen-direct-cleanup.service';
import { HeygenDirectGateway } from './heygen-direct.gateway';

@Module({
  controllers: [
    HeygenDirectController,
  ],
  providers: [
    HeygenDirectService,
    HeygenDirectCleanupService,
    HeygenDirectGateway,
  ],
  exports: [
    HeygenDirectService,
  ],
})
export class HeygenModule {}