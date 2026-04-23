import { Module } from '@nestjs/common';
import { LiveavatarController } from './liveavatar.controller';
import { LiveavatarService } from './liveavatar.service';
import { LiveavatarSpeakGateway } from './liveavatar-speak.gateway';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';

@Module({
  imports: [ElevenLabsModule],
  controllers: [LiveavatarController],
  providers: [LiveavatarService, LiveavatarSpeakGateway],
  exports: [LiveavatarService],
})
export class LiveavatarModule {}
