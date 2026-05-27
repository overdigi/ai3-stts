import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AzureTtsService } from './azure-tts.service';

const CHUNK_SIZE = 4096; // bytes per chunk sent to LiveAvatar

const DEFAULT_VOICE_NAME = 'zh-TW-HsiaoChenNeural';

@WebSocketGateway({
  namespace: 'liveavatar-speak',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class LiveavatarSpeakGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveavatarSpeakGateway.name);

  constructor(private readonly azureTtsService: AzureTtsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`LiveAvatar Speak client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`LiveAvatar Speak client disconnected: ${client.id}`);
  }

  /**
   * Client sends: { text, voiceName?, voiceId?, apiKey? }
   *   - voiceName: Azure voice name (e.g. "zh-TW-HsiaoChenNeural"). Optional.
   *
   * Server responds with:
   *   speak-chunk: { data: base64, index: number }  (multiple)
   *   speak-end:   { totalChunks: number }
   *   speak-error: { error: string }
   *
   * Audio format: RAW 24kHz, 16-bit, mono PCM (little-endian, no header).
   */
  @SubscribeMessage('speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      text: string;
      voiceName?: string;
      voiceId?: string; // HeyGen voice UUID — ignored for Azure TTS
      apiKey?: string;
    },
  ) {
    if (process.env.API_KEY && data.apiKey !== process.env.API_KEY) {
      client.emit('speak-error', { error: 'Invalid API Key' });
      return;
    }

    if (!data.text?.trim()) {
      client.emit('speak-error', { error: '缺少 text' });
      return;
    }

    const voiceName =
      data.voiceName ||
      process.env.AZURE_TTS_VOICE_NAME ||
      DEFAULT_VOICE_NAME;

    try {
      const pcm = await this.azureTtsService.synthesizePcm({
        text: data.text,
        voiceName,
      });

      let index = 0;
      for (let offset = 0; offset < pcm.length; offset += CHUNK_SIZE) {
        const chunk = pcm.subarray(offset, offset + CHUNK_SIZE);
        client.emit('speak-chunk', {
          data: chunk.toString('base64'),
          index: index++,
        });
      }

      client.emit('speak-end', { totalChunks: index });
    } catch (error) {
      this.logger.error('Azure TTS 錯誤:', error);
      client.emit('speak-error', {
        error: error instanceof Error ? error.message : 'TTS 失敗',
      });
    }
  }
}
