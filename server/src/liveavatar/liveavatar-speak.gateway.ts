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
import { ElevenLabsService } from '../elevenlabs/elevenlabs.service';

const CHUNK_SIZE = 4096; // bytes per chunk sent to LiveAvatar

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

  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`LiveAvatar Speak client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`LiveAvatar Speak client disconnected: ${client.id}`);
  }

  /**
   * Client sends: { text, voiceId?, modelId?, apiKey? }
   * Server responds with:
   *   speak-chunk: { data: base64, index: number }  (multiple)
   *   speak-end: {}
   *   speak-error: { error: string }
   */
  @SubscribeMessage('speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      text: string;
      voiceId?: string;
      modelId?: string;
      apiKey?: string;
    },
  ) {
    if (process.env.API_KEY && data.apiKey !== process.env.API_KEY) {
      client.emit('speak-error', { error: 'Invalid API Key' });
      return;
    }

    const voiceId = data.voiceId || process.env.ELEVENLABS_VOICE_ID;
    if (!voiceId) {
      client.emit('speak-error', { error: '缺少 voiceId' });
      return;
    }

    if (!data.text?.trim()) {
      client.emit('speak-error', { error: '缺少 text' });
      return;
    }

    try {
      const pcm = await this.elevenLabsService.synthesizePcm({
        text: data.text,
        voiceId,
        modelId: data.modelId,
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
      this.logger.error('ElevenLabs TTS 錯誤:', error);
      client.emit('speak-error', {
        error: error instanceof Error ? error.message : 'TTS 失敗',
      });
    }
  }
}
