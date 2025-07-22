import { Module } from '@nestjs/common';
import { HeygenController } from './heygen.controller';
import { HeygenService } from './heygen.service';
import { HeygenStreamingController } from './heygen-streaming.controller';
import { HeygenStreamingService } from './heygen-streaming.service';

@Module({
  controllers: [HeygenController, HeygenStreamingController],
  providers: [HeygenService, HeygenStreamingService],
  exports: [HeygenService, HeygenStreamingService],
})
export class HeygenModule {}