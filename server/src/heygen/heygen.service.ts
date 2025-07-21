import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface AvatarConfig {
  id: string;
  name: string;
  defaultVoiceId: string;
}

export interface SpeakRequest {
  text: string;
  avatarId: string;
  voiceId: string;
}

@Injectable()
export class HeygenService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  // 預設的角色配置 - 從環境變數讀取
  private readonly defaultAvatars: AvatarConfig[] = [
    {
      id: 'default-avatar',
      name: '1966長照專線',
      defaultVoiceId: 'default-voice',
    },
  ];

  constructor() {
    this.baseUrl = process.env.HEYGEN_API_URL || 'https://api.heygen.com/v1';
    this.apiKey = process.env.HEYGEN_API_KEY;
    
    // 調試：檢查環境變數
    console.log('Environment variables:');
    console.log('AVATAR_ID:', process.env.AVATAR_ID);
    console.log('VOICE_ID:', process.env.VOICE_ID);
    
    // 從環境變數讀取角色配置
    if (process.env.AVATAR_ID && process.env.VOICE_ID) {
      console.log('Using environment variables for avatar config');
      this.defaultAvatars[0] = {
        id: process.env.AVATAR_ID,
        name: '1966長照專線',
        defaultVoiceId: process.env.VOICE_ID,
      };
    } else {
      console.log('Environment variables not found, using default config');
    }
    
    console.log('Final avatar config:', this.defaultAvatars[0]);
  }

  async speakText(request: SpeakRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('HeyGen API key not configured');
      }

      // 呼叫 HeyGen API (這裡需要根據實際的 HeyGen API 規格調整)
      const response = await axios.post(
        `${this.baseUrl}/streaming/speak`,
        {
          text: request.text,
          avatar_id: request.avatarId,
          voice_id: request.voiceId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.data.message_id || `msg-${Date.now()}`,
      };
    } catch (error) {
      console.error('HeyGen API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  getAvatarConfigs(): AvatarConfig[] {
    return this.defaultAvatars;
  }

  getAvatarConfig(avatarId: string): AvatarConfig | null {
    return this.defaultAvatars.find(avatar => avatar.id === avatarId) || null;
  }

  generateIframeHtml(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    if (!avatar) {
      return '<div>Avatar not found</div>';
    }

    // 這裡需要根據實際的 HeyGen iframe 規格調整
    // 目前是一個範例實作
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Avatar - ${avatar.name}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .avatar-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .avatar-placeholder {
            width: 300px;
            height: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 18px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="avatar-container">
          <div class="avatar-placeholder">
            <div>
              <h3>${avatar.name}</h3>
              <p>Avatar ID: ${avatar.id}</p>
              <p>Voice ID: ${avatar.defaultVoiceId}</p>
              <p>Ready for speech synthesis</p>
            </div>
          </div>
        </div>
        
        <script>
          // 這裡可以加入與父視窗通訊的邏輯
          window.addEventListener('message', function(event) {
            if (event.data.type === 'speak') {
              console.log('Speaking:', event.data.text);
              // 這裡應該觸發實際的語音播放
              // 目前只是在 console 顯示
            }
          });
          
          // 通知父視窗 iframe 已載入完成
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}'
          }, '*');
        </script>
      </body>
      </html>
    `;
  }
}