import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SttService } from './stt.service';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

@WebSocketGateway({
  namespace: 'stt',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class SttGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions = new Map<string, {
    recognizer: sdk.SpeechRecognizer;
    pushStream: sdk.PushAudioInputStream;
  }>();

  constructor(private readonly sttService: SttService) {}

  handleConnection(client: Socket) {
    console.log(`STT Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`STT Client disconnected: ${client.id}`);
    this.endSession(client.id);
  }

  @SubscribeMessage('start-stt')
  async startSTT(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { language?: string; apiKey?: string },
  ) {
    try {
      console.log(`Starting STT session for client: ${client.id}`);
      
      // 暫時禁用 API Key 驗證用於測試
      // if (process.env.API_KEY && data.apiKey !== process.env.API_KEY) {
      //   client.emit('stt-error', { error: 'Invalid API Key' });
      //   return;
      // }

      // 清理之前的會話
      this.endSession(client.id);

      // 建立新的語音識別會話（使用正確的音訊格式）
      console.log('Creating audio format and stream...');
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
      
      console.log('Creating recognizer...');
      const recognizer = this.sttService.createRecognizerFromStream(pushStream);

      // 設定事件處理器
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
          client.emit('stt-recognizing', {
            text: e.result.text,
            confidence: 0,
            language: data.language || 'zh-TW',
          });
        }
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          client.emit('stt-result', {
            text: e.result.text,
            confidence: 1,
            language: data.language || 'zh-TW',
          });
        }
      };

      recognizer.canceled = (s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          client.emit('stt-error', { error: e.errorDetails });
        }
        this.endSession(client.id);
      };

      // 儲存會話
      this.sessions.set(client.id, { recognizer, pushStream });

      // 開始連續識別
      console.log('Starting continuous recognition...');
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log(`STT session started successfully for client: ${client.id}`);
          client.emit('stt-started', { sessionId: client.id });
        },
        (error) => {
          console.error(`STT start failed for client ${client.id}:`, error);
          client.emit('stt-error', { error: error.toString() });
          this.endSession(client.id);
        }
      );

    } catch (error) {
      console.error(`STT session creation failed for client ${client.id}:`, error);
      client.emit('stt-error', { error: error.message });
    }
  }

  @SubscribeMessage('audio-data')
  async handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: Buffer | ArrayBuffer },
  ) {
    const session = this.sessions.get(client.id);
    if (!session) {
      client.emit('stt-error', { error: 'No active STT session' });
      return;
    }

    try {
      const audioBuffer = Buffer.isBuffer(data.audio) 
        ? data.audio 
        : Buffer.from(data.audio);
      
      session.pushStream.write(audioBuffer);
    } catch (error) {
      client.emit('stt-error', { error: error.message });
    }
  }

  @SubscribeMessage('stop-stt')
  async stopSTT(@ConnectedSocket() client: Socket) {
    this.endSession(client.id);
    client.emit('stt-stopped');
  }

  private endSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (session) {
      try {
        session.recognizer.stopContinuousRecognitionAsync();
        session.recognizer.close();
        session.pushStream.close();
      } catch (error) {
        console.error('Error ending STT session:', error);
      }
      this.sessions.delete(clientId);
    }
  }
}