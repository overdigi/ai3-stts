import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface VoiceSettings {
  speed?: number;
  stability?: number;
  style?: number;
}

export interface CreateTokenOptions {
  avatarId: string;
  voiceId?: string;
  quality?: 'very_high' | 'high' | 'medium' | 'low';
  isSandbox?: boolean;
  language?: string;
  maxSessionDuration?: number;
  voiceSettings?: VoiceSettings;
}

export interface CreateTokenResult {
  sessionId: string;
  sessionToken: string;
}

@Injectable()
export class LiveavatarService {
  private readonly logger = new Logger(LiveavatarService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = process.env.LIVEAVATAR_API_URL || 'https://api.liveavatar.com';
    const apiKey = process.env.LIVEAVATAR_API_KEY;

    if (!apiKey) {
      throw new Error('LIVEAVATAR_API_KEY 環境變數未設定');
    }

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  async createSessionToken(options: CreateTokenOptions): Promise<CreateTokenResult> {
    this.logger.log(`建立 LiveAvatar session token: avatarId=${options.avatarId}`);

    const persona: Record<string, unknown> = {};
    if (options.voiceId) {
      persona.voice_id = options.voiceId;
    }
    if (options.language) {
      persona.language = options.language;
    }
    if (options.voiceSettings) {
      const vs: Record<string, unknown> = {};
      if (options.voiceSettings.speed != null) vs.speed = options.voiceSettings.speed;
      if (options.voiceSettings.stability != null) vs.stability = options.voiceSettings.stability;
      if (options.voiceSettings.style != null) vs.style = options.voiceSettings.style;
      if (Object.keys(vs).length > 0) persona.voice_settings = vs;
    }

    const requestBody: Record<string, unknown> = {
      mode: 'FULL',
      avatar_id: options.avatarId,
      is_sandbox: options.isSandbox ?? false,
      interactivity_type: 'CONVERSATIONAL',
      avatar_persona: persona,
    };

    if (options.maxSessionDuration) {
      const maxAllowed = options.isSandbox ? 60 : 1200;
      requestBody.max_session_duration = Math.min(options.maxSessionDuration, maxAllowed);
    }
    if (options.quality) {
      requestBody.video_settings = { quality: options.quality };
    }

    try {
      const response = await this.httpClient.post('/v1/sessions/token', requestBody);

      if (response.data.code !== 1000 || !response.data.data) {
        throw new Error(
          `LiveAvatar API 錯誤: ${response.data.message || '未知錯誤'}`,
        );
      }

      const { session_id, session_token } = response.data.data;
      this.logger.log(`Session token 建立成功: ${session_id}`);

      return {
        sessionId: session_id,
        sessionToken: session_token,
      };
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `LiveAvatar API HTTP 錯誤 [${error.response.status}]:`,
          error.response.data,
        );
        throw new Error(`LiveAvatar API 錯誤: HTTP ${error.response.status}`);
      }
      if (error.request) {
        this.logger.error('LiveAvatar API 網路錯誤:', error.message);
        throw new Error(`網路錯誤: ${error.message}`);
      }
      throw error;
    }
  }

  async getConfig(): Promise<{ avatarId?: string; voiceId?: string }> {
    return {
      avatarId: process.env.AVATAR_ID,
      voiceId: process.env.VOICE_ID,
    };
  }
}
