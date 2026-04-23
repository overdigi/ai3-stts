import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SttModule } from './stt/stt.module';
import { LiveavatarModule } from './liveavatar/liveavatar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SttModule,
    LiveavatarModule,
  ],
})
export class AppModule {}