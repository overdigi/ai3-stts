import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SttModule } from './stt/stt.module';
import { HeygenModule } from './heygen/heygen.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SttModule, 
    HeygenModule
  ],
})
export class AppModule {}