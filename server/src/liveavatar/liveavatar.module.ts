import { Module } from '@nestjs/common';
import { LiveavatarController } from './liveavatar.controller';
import { LiveavatarService } from './liveavatar.service';

@Module({
  controllers: [LiveavatarController],
  providers: [LiveavatarService],
  exports: [LiveavatarService],
})
export class LiveavatarModule {}
