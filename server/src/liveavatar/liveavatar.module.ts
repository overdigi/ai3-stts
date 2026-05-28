import { Module } from '@nestjs/common';
import { LiveavatarController } from './liveavatar.controller';
import { LiveavatarService } from './liveavatar.service';
import { LiveavatarSpeakGateway } from './liveavatar-speak.gateway';
import { AzureTtsService } from './azure-tts.service';
import { PhonemeService } from './phoneme.service';

@Module({
  controllers: [LiveavatarController],
  providers: [LiveavatarService, LiveavatarSpeakGateway, AzureTtsService, PhonemeService],
  exports: [LiveavatarService],
})
export class LiveavatarModule {}
