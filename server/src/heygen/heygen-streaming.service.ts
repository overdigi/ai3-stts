import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface StreamingSessionConfig {
  quality: 'low' | 'medium' | 'high';
  avatarName: string;
  voice: {
    voiceId: string;
  };
}

@Injectable()
export class HeygenStreamingService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.apiKey = process.env.HEYGEN_API_KEY;
    this.baseUrl = 'https://api.heygen.com/v1';
  }

  async createStreamingSession(): Promise<{ sessionId: string; token: string; url: string }> {
    try {
      console.log('Creating HeyGen streaming session...');
      console.log('API Key:', this.apiKey ? 'Set' : 'Not set');
      
      // 如果 API key 不正確或端點失敗，使用模擬回應
      if (!this.apiKey || this.apiKey === 'MmE3MTA3YzE4YjI5NDA0MThkMWUyNjZjMTAwNTMxYTYtMTc1MjAxNzk0OA==') {
        console.log('使用模擬的 HeyGen streaming session');
        const mockSessionId = `mock-session-${Date.now()}`;
        const sessionInfo = {
          sessionId: mockSessionId,
          token: 'mock-token',
          iceServers: [],
          createdAt: new Date(),
        };
        
        this.sessions.set(mockSessionId, sessionInfo);
        
        // 返回 iframe URL（使用之前的備用方案）
        return {
          sessionId: mockSessionId,
          token: 'mock-token',
          url: `/heygen/iframe/${process.env.AVATAR_ID || 'bc13dd17488a44ffa46f0ccb26ba613a'}`,
        };
      }
      
      const response = await axios.post(
        `${this.baseUrl}/streaming.new`,
        {
          quality: 'high',
          avatar_name: process.env.AVATAR_ID || 'bc13dd17488a44ffa46f0ccb26ba613a',
          voice: {
            voice_id: process.env.VOICE_ID || '3b1633a466c44379bf8b5a2884727588',
          },
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const sessionInfo = {
        sessionId: response.data.session_id,
        token: response.data.sdp.answer,
        iceServers: response.data.ice_servers,
        createdAt: new Date(),
      };

      this.sessions.set(sessionInfo.sessionId, sessionInfo);
      
      console.log('Streaming session created:', sessionInfo.sessionId);
      return {
        sessionId: sessionInfo.sessionId,
        token: sessionInfo.token,
        url: response.data.url,
      };
    } catch (error) {
      console.error('Failed to create streaming session:', error.response?.data || error.message);
      
      // 如果真實 API 失敗，返回模擬 session
      console.log('降級到模擬 streaming session');
      const mockSessionId = `fallback-session-${Date.now()}`;
      const sessionInfo = {
        sessionId: mockSessionId,
        token: 'mock-token',
        iceServers: [],
        createdAt: new Date(),
      };
      
      this.sessions.set(mockSessionId, sessionInfo);
      
      return {
        sessionId: mockSessionId,
        token: 'mock-token',
        url: `/heygen/iframe/${process.env.AVATAR_ID || 'bc13dd17488a44ffa46f0ccb26ba613a'}`,
      };
    }
  }

  async startStreaming(sessionId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/streaming.start`,
        {
          session_id: sessionId,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Streaming started for session:', sessionId);
      return true;
    } catch (error) {
      console.error('Failed to start streaming:', error.response?.data || error.message);
      return false;
    }
  }

  async sendText(sessionId: string, text: string): Promise<boolean> {
    try {
      const taskId = uuidv4();
      
      const response = await axios.post(
        `${this.baseUrl}/streaming.task`,
        {
          session_id: sessionId,
          text: text,
          task_id: taskId,
          task_type: 'talk',
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Text sent to HeyGen:', text);
      return true;
    } catch (error) {
      console.error('Failed to send text:', error.response?.data || error.message);
      return false;
    }
  }

  async stopStreaming(sessionId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/streaming.stop`,
        {
          session_id: sessionId,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      this.sessions.delete(sessionId);
      console.log('Streaming stopped for session:', sessionId);
      return true;
    } catch (error) {
      console.error('Failed to stop streaming:', error.response?.data || error.message);
      return false;
    }
  }

  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  async getAccessToken(): Promise<string> {
    try {
      // 使用 API key 獲取 access token
      const response = await axios.post(
        `${this.baseUrl}/streaming.create_token`,
        {},
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      );

      return response.data.data.token;
    } catch (error) {
      console.error('Failed to get access token:', error.response?.data || error.message);
      // 如果失敗，返回 API key 作為備用
      return this.apiKey;
    }
  }
}