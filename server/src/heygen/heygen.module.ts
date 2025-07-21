import { Module } from '@nestjs/common';
import { HeygenController } from './heygen.controller';
import { HeygenService } from './heygen.service';

@Module({
  controllers: [HeygenController],
  providers: [HeygenService],
  exports: [HeygenService],
})
export class HeygenModule {}