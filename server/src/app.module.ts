import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SttModule } from './stt/stt.module';
import { HeygenModule } from './heygen/heygen.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    SttModule, 
    HeygenModule
  ],
})
export class AppModule {}