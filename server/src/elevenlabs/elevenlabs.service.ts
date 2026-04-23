import { Injectable, Logger } from '@nestjs/common';
import { ElevenLabsClient } from 'elevenlabs';

export interface SynthesizeOptions {
  text: string;
  voiceId: string;
  modelId?: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly client: ElevenLabsClient;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY 環境變數未設定');
    }
    this.client = new ElevenLabsClient({ apiKey });
  }

  async synthesizePcm(options: SynthesizeOptions): Promise<Buffer> {
    const { text, voiceId, modelId = 'eleven_v3' } = options;
    this.logger.log(`ElevenLabs TTS: voiceId=${voiceId}, model=${modelId}`);

    const audioStream = await this.client.textToSpeech.convertAsStream(voiceId, {
      text,
      model_id: modelId,
      output_format: 'pcm_24000',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
