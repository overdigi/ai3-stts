import { io, Socket } from 'socket.io-client';

export interface AI3STTSConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
}

export interface STTStartOptions {
  language?: string;
}

export interface SpeakOptions {
  avatarId: string;
  voiceId?: string;
}

export interface AvatarConfig {
  id: string;
  name: string;
  defaultVoiceId: string;
}

export class STTSession {
  private socket: Socket;
  private isActive = false;
  private resultCallback?: (result: STTResult) => void;
  private recognizingCallback?: (result: STTResult) => void;
  private errorCallback?: (error: string) => void;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('stt-started', (data) => {
      this.isActive = true;
      console.log('STT session started:', data);
    });

    this.socket.on('stt-result', (data: STTResult) => {
      console.log('STT result received:', data);
      if (this.resultCallback) {
        this.resultCallback(data);
      }
    });

    this.socket.on('stt-recognizing', (data: STTResult) => {
      console.log('STT recognizing:', data);
      if (this.recognizingCallback) {
        this.recognizingCallback(data);
      }
    });

    this.socket.on('stt-error', (data: { error: string }) => {
      console.error('STT Error:', data.error);
      if (this.errorCallback) {
        this.errorCallback(data.error);
      }
    });

    this.socket.on('stt-stopped', () => {
      this.isActive = false;
      console.log('STT session stopped');
    });
  }

  onResult(callback: (result: STTResult) => void) {
    this.resultCallback = callback;
  }

  onRecognizing(callback: (result: STTResult) => void) {
    this.recognizingCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.errorCallback = callback;
  }

  sendAudio(audioData: ArrayBuffer | Blob) {
    if (!this.isActive) {
      console.warn('STT session is not active');
      return;
    }

    const size = audioData instanceof Blob ? audioData.size : audioData.byteLength;
    console.log('Sending audio data, size:', size);
    this.socket.emit('audio-data', { audio: audioData });
  }

  stop() {
    if (this.isActive) {
      this.socket.emit('stop-stt');
      this.isActive = false;
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

export class AI3STTS {
  private config: AI3STTSConfig;
  private socket?: Socket;

  constructor(config: AI3STTSConfig) {
    this.config = config;
  }

  private getSocket(): Socket {
    if (!this.socket) {
      console.log('Creating WebSocket connection to:', `${this.config.apiUrl}/stt`);
      this.socket = io(`${this.config.apiUrl}/stt`, {
        transports: ['websocket'],
        forceNew: true,
      });
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected successfully');
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
      
      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
    }
    return this.socket;
  }

  async startSTT(options: STTStartOptions = {}): Promise<STTSession> {
    return new Promise((resolve, reject) => {
      console.log('startSTT 開始，清理舊連接...');
      
      // 強制清理舊 Socket
      if (this.socket) {
        console.log('發現舊 socket，正在斷開...');
        this.socket.disconnect();
        this.socket.removeAllListeners();
        this.socket = undefined;
        console.log('舊 socket 已清理');
      }
      
      // 確保完全清理
      setTimeout(() => {
        console.log('建立新 Socket 連接...');
        const socket = this.getSocket();
        
        const startSession = () => {
          console.log('Socket 已連接，開始 STT 會話...');
          const session = new STTSession(socket);
          
          socket.emit('start-stt', {
            language: options.language || 'zh-TW',
            apiKey: this.config.apiKey,
          });

          const successHandler = () => {
            console.log('收到 stt-started 事件');
            resolve(session);
          };

          const errorHandler = (data: { error: string }) => {
            console.log('收到 stt-error 事件:', data);
            reject(new Error(data.error));
          };

          socket.once('stt-started', successHandler);
          socket.once('stt-error', errorHandler);
        };

        // 等待連接
        socket.once('connect', startSession);
        socket.once('connect_error', (error) => {
          console.log('Socket 連接失敗:', error);
          reject(error);
        });
        
        socket.connect();
      }, 100); // 短暫延遲確保清理完成
    });
  }

  async speakText(text: string, options: SpeakOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/heygen/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'x-api-key': this.config.apiKey }),
        },
        body: JSON.stringify({
          text,
          avatarId: options.avatarId,
          voiceId: options.voiceId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAvatarConfigs(): Promise<{ avatars: AvatarConfig[] }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/heygen/config`, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { 'x-api-key': this.config.apiKey }),
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get avatar configs:', error);
      return { avatars: [] };
    }
  }

  getIframeUrl(avatarId: string): string {
    return `${this.config.apiUrl}/heygen/iframe/${avatarId}`;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}

// Export for UMD build
if (typeof window !== 'undefined') {
  (window as any).AI3STTS = AI3STTS;
  console.log('🚀 AI3-STTS SDK v2.1 載入完成 - 包含Socket清理修復');
}

export default AI3STTS;