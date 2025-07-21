import { Module } from '@nestjs/common';
import { SttController } from './stt.controller';
import { SttService } from './stt.service';
import { SttGateway } from './stt.gateway';

@Module({
  controllers: [SttController],
  providers: [SttService, SttGateway],
  exports: [SttService],
})
export class SttModule {}