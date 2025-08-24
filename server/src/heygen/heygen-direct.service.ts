import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface HeyGenDirectSession {
  sessionId: string;
  avatarId: string;
  voiceId?: string;
  token: string;
  status: 'idle' | 'initializing' | 'ready' | 'speaking' | 'error' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
  heygenSessionId?: string;
  error?: string;
  // LiveKit 連接資訊
  livekitUrl?: string;
  livekitToken?: string;
  livekitIceServers?: any[];
  // HeyGen realtime WebRTC endpoint
  realtimeEndpoint?: string;
}

export interface CreateSessionOptions {
  avatarId: string;
  voiceId?: string;
  token: string;
}

@Injectable()
export class HeygenDirectService {
  private readonly logger = new Logger(HeygenDirectService.name);
  private readonly sessions = new Map<string, HeyGenDirectSession>();
  private readonly httpClient: AxiosInstance;
  private readonly heygenApiUrl: string;
  private readonly heygenApiKey: string;

  constructor() {
    this.heygenApiUrl = process.env.HEYGEN_API_URL || 'https://api.heygen.com/v2';
    this.heygenApiKey = process.env.HEYGEN_API_KEY;

    if (!this.heygenApiKey) {
      throw new Error('HEYGEN_API_KEY 環境變數未設定');
    }

    this.httpClient = axios.create({
      baseURL: this.heygenApiUrl,
      headers: {
        'Authorization': `Bearer ${this.heygenApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async createSession(options: CreateSessionOptions): Promise<{
    sessionId: string;
    livekitUrl?: string;
    livekitToken?: string;
    livekitIceServers?: any[];
  }> {
    const sessionId = uuidv4();
    
    this.logger.log(`建立新的 HeyGen 直接會話: ${sessionId}`);

    const session: HeyGenDirectSession = {
      sessionId,
      avatarId: options.avatarId,
      voiceId: options.voiceId,
      token: options.token,
      status: 'initializing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    try {
      // 建立 HeyGen LiveKit 會話
      this.logger.log(`調用 HeyGen API: POST /v1/streaming.new`);
      this.logger.log(`請求參數: avatar_id=${options.avatarId}, voice_id=${options.voiceId}`);
      
      const requestBody: any = {
        version: "v2",
        avatar_id: options.avatarId,
      };
      
      if (options.voiceId) {
        requestBody.voice = { voice_id: options.voiceId };
      }
      
      const response = await this.httpClient.post('/v1/streaming.new', requestBody);

      this.logger.log(`HeyGen API 響應狀態: ${response.status}`);
      this.logger.log(`HeyGen API 響應數據:`, JSON.stringify(response.data, null, 2));

      if (response.data.code === 100) {
        session.heygenSessionId = response.data.data.session_id;
        
        // 儲存 LiveKit 連接資訊
        if (response.data.data.url) {
          session.livekitUrl = response.data.data.url;
        }
        if (response.data.data.access_token) {
          session.livekitToken = response.data.data.access_token;
        }
        if (response.data.data.ice_servers) {
          session.livekitIceServers = response.data.data.ice_servers;
        }
        // 儲存 HeyGen realtime endpoint
        if (response.data.data.realtime_endpoint) {
          session.realtimeEndpoint = response.data.data.realtime_endpoint;
        }
        
        session.status = 'ready';
        session.updatedAt = new Date();
        
        this.logger.log(`HeyGen 會話建立成功: ${session.heygenSessionId}`);
        this.logger.log(`LiveKit URL: ${session.livekitUrl}`);
      } else {
        const errorMsg = `HeyGen API 錯誤 [code=${response.data.code}]: ${response.data.message || response.data.error || '未知錯誤'}`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      session.status = 'error';
      
      if (error.response) {
        // HTTP 錯誤響應
        const statusCode = error.response.status;
        const responseData = error.response.data;
        session.error = `HTTP ${statusCode}: ${JSON.stringify(responseData)}`;
        this.logger.error(`HeyGen API HTTP 錯誤 [${statusCode}]:`, responseData);
      } else if (error.request) {
        // 請求發送失敗
        session.error = `網路錯誤: ${error.message}`;
        this.logger.error(`HeyGen API 網路錯誤:`, error.message);
      } else {
        // 其他錯誤
        session.error = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`建立 HeyGen 會話失敗:`, session.error);
      }
      
      session.updatedAt = new Date();
      throw error;
    }

    return {
      sessionId,
      livekitUrl: session.livekitUrl,
      livekitToken: session.livekitToken,
      livekitIceServers: session.livekitIceServers,
      realtimeEndpoint: session.realtimeEndpoint,
    } as {
      sessionId: string;
      livekitUrl?: string;
      livekitToken?: string;
      livekitIceServers?: any[];
      realtimeEndpoint?: string;
    };
  }

  async speak(sessionId: string, text: string, token: string): Promise<void> {
    const session = this.getSessionByIdAndToken(sessionId, token);

    if (session.status !== 'ready' && session.status !== 'speaking') {
      throw new Error(`會話狀態不正確: ${session.status}`);
    }

    if (!session.heygenSessionId) {
      throw new Error('HeyGen 會話 ID 不存在');
    }

    this.logger.log(`發送語音合成請求 [${sessionId}]: ${text}`);

    session.status = 'speaking';
    session.updatedAt = new Date();

    try {
      // 使用正確的 HeyGen 語音合成 API 端點  
      const response = await this.httpClient.post('/v1/streaming.task', {
        session_id: session.heygenSessionId,
        text,
      });

      if (response.data.code !== 100) {
        throw new Error(`HeyGen API 錯誤: ${response.data.message}`);
      }

      this.logger.log(`語音合成請求發送成功 [${sessionId}]`);
      
      // 設定回到 ready 狀態（實際應該監聽 HeyGen 事件）
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          session.status = 'ready';
          session.updatedAt = new Date();
        }
      }, 2000);
      
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      
      this.logger.error(`語音合成請求失敗 [${sessionId}]: ${session.error}`);
      throw error;
    }
  }

  async stopSession(sessionId: string, token: string): Promise<void> {
    const session = this.getSessionByIdAndToken(sessionId, token);

    if (session.status === 'stopped') {
      this.logger.warn(`會話已停止 [${sessionId}]`);
      return;
    }

    this.logger.log(`停止 HeyGen 直接會話: ${sessionId}`);

    try {
      if (session.heygenSessionId) {
        const response = await this.httpClient.post('/v1/streaming.stop', {
          session_id: session.heygenSessionId,
        });

        if (response.data.code !== 100) {
          this.logger.warn(`停止 HeyGen 會話時發生警告: ${response.data.message}`);
        }
      }

      session.status = 'stopped';
      session.updatedAt = new Date();
      
      // 延遲移除會話以允許查詢狀態
      setTimeout(() => {
        this.sessions.delete(sessionId);
        this.logger.log(`會話已清理: ${sessionId}`);
      }, 60000); // 1分鐘後清理

    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      
      this.logger.error(`停止會話時發生錯誤 [${sessionId}]: ${session.error}`);
      throw error;
    }
  }

  async getSessionStatus(sessionId: string, token: string): Promise<{
    status: string;
    message?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    livekitUrl?: string;
    livekitToken?: string;
    livekitIceServers?: any[];
  }> {
    const session = this.getSessionByIdAndToken(sessionId, token);

    return {
      status: session.status,
      message: this.getStatusMessage(session.status),
      error: session.error,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      livekitUrl: session.livekitUrl,
      livekitToken: session.livekitToken,
      livekitIceServers: session.livekitIceServers,
    };
  }

  async getAllSessions(token: string): Promise<Array<{
    sessionId: string;
    avatarId: string;
    voiceId?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.token === token)
      .map(session => ({
        sessionId: session.sessionId,
        avatarId: session.avatarId,
        voiceId: session.voiceId,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));

    return userSessions;
  }

  private getSessionByIdAndToken(sessionId: string, token: string): HeyGenDirectSession {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`會話不存在: ${sessionId}`);
    }

    // 簡化授權檢查，允許 demo 測試
    if (session.token !== token && token !== 'default' && session.token !== 'default') {
      throw new Error('無權限存取此會話');
    }

    return session;
  }

  private getStatusMessage(status: HeyGenDirectSession['status']): string {
    switch (status) {
      case 'idle': return '閒置中';
      case 'initializing': return '初始化中...';
      case 'ready': return '準備就緒';
      case 'speaking': return '語音合成中...';
      case 'error': return '發生錯誤';
      case 'stopped': return '已停止';
      default: return '未知狀態';
    }
  }

  // 建立 HeyGen Streaming Token（官方 SDK 方式）
  async createStreamingToken(avatarId: string): Promise<string> {
    this.logger.log(`建立 HeyGen Streaming Token for avatar: ${avatarId}`);
    
    try {
      // 根據 avatarId 找到對應的 API Key（參考官方 Demo 做法）
      const AVATARS = [
        {
          avatar_id: "bc13dd17488a44ffa46f0ccb26ba613a",
          name: "WILL", 
          api_key_env: "HEYGEN_API_KEY_WILL",
        },
        {
          avatar_id: "253b320ceb964b87b10c858a7af25348", 
          name: "CRCH",
          api_key_env: "HEYGEN_API_KEY_CRCH",
        },
      ];
      
      const avatar = AVATARS.find((a) => a.avatar_id === avatarId);
      
      if (!avatar || !avatar.api_key_env) {
        throw new Error(`No API key env found for avatar: ${avatarId}`);
      }
      
      // 從環境變數中讀取對應的 API Key
      const apiKey = process.env[avatar.api_key_env];
      
      if (!apiKey) {
        throw new Error(`Environment variable ${avatar.api_key_env} not found`);
      }
      
      this.logger.log(`Using API key from ${avatar.api_key_env} for ${avatar.name} (${avatarId})`);
      
      // 使用官方端點建立 token
      const response = await axios.post(
        `${this.heygenApiUrl}/v1/streaming.create_token`,
        {},
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      );
      
      this.logger.log('Token Response:', response.status);
      
      if (!response.data.data || !response.data.data.token) {
        throw new Error(`API request failed: Invalid response format`);
      }
      
      return response.data.data.token;
    } catch (error) {
      if (error.response) {
        this.logger.error(`HeyGen Token API HTTP 錯誤 [${error.response.status}]:`, error.response.data);
        throw new Error(`API request failed: ${error.response.status}`);
      } else if (error.request) {
        this.logger.error(`HeyGen Token API 網路錯誤:`, error.message);
        throw new Error(`Network error: ${error.message}`);
      } else {
        this.logger.error(`建立 Token 失敗:`, error.message);
        throw error;
      }
    }
  }

  // 清理過期會話的方法
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.updatedAt.getTime();
      const maxAge = 10 * 60 * 1000; // 10分鐘

      if (age > maxAge && session.status !== 'speaking') {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      try {
        const session = this.sessions.get(sessionId);
        if (session) {
          await this.stopSession(sessionId, session.token);
        }
      } catch (error) {
        this.logger.error(`清理過期會話時發生錯誤 [${sessionId}]:`, error);
      }
    }

    if (expiredSessions.length > 0) {
      this.logger.log(`已清理 ${expiredSessions.length} 個過期會話`);
    }
  }
}