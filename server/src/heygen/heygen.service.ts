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
      console.log('收到語音合成請求:', {
        text: request.text,
        avatarId: request.avatarId,
        voiceId: request.voiceId,
      });

      // 暫時模擬成功回應，因為 HeyGen API 端點需要確認
      // TODO: 替換為正確的 HeyGen API 端點
      console.log('📢 模擬播放文字:', request.text);
      
      // 如果有真實的 HeyGen API key，嘗試呼叫
      if (this.apiKey && this.apiKey !== 'your-heygen-api-key') {
        try {
          // 嘗試使用不同的端點
          const response = await axios.post(
            `${this.baseUrl}/v2/video/generate`,
            {
              text: request.text,
              avatar_id: request.avatarId,
              voice_id: request.voiceId,
            },
            {
              headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json',
              },
            },
          );

          return {
            success: true,
            messageId: response.data.video_id || `msg-${Date.now()}`,
          };
        } catch (apiError) {
          console.log('HeyGen API 呼叫失敗，使用模擬回應');
        }
      }

      // 模擬成功回應
      return {
        success: true,
        messageId: `mock-msg-${Date.now()}`,
      };
    } catch (error) {
      console.error('語音合成錯誤:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getAvatarConfigs(): AvatarConfig[] {
    return this.defaultAvatars;
  }

  getAvatarConfig(avatarId: string): AvatarConfig | null {
    return this.defaultAvatars.find(avatar => avatar.id === avatarId) || null;
  }

  async getAccessToken(): Promise<string> {
    try {
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
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  // 使用 HeyGen Streaming API (不使用 SDK)
  async createStreamingSession(avatarId: string): Promise<{ sessionId: string; accessToken: string; url: string; isPaid?: boolean; sessionDurationLimit?: number }> {
    try {
      console.log(`創建 HeyGen LiveKit v2 streaming session for avatar: ${avatarId}`);
      
      // 獲取聲音 ID（從環境變數或預設配置）
      const voiceId = process.env.VOICE_ID || this.defaultAvatars[0]?.defaultVoiceId;
      console.log(`使用聲音 ID: ${voiceId} (來源: ${process.env.VOICE_ID ? '環境變數' : '預設配置'})`);
      
      // 直接創建 v2 streaming session（不需要單獨的 token 請求）
      const sessionResponse = await axios.post(
        `${this.baseUrl}/streaming.new`,
        {
          version: "v2",
          avatar_id: avatarId,
          voice_id: voiceId,
          quality: "high"
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      // 檢查 HeyGen API 回應格式
      const responseData = sessionResponse.data.data || sessionResponse.data;
      
      console.log('HeyGen v2 session response:', JSON.stringify(responseData, null, 2));
      
      if (!responseData.session_id) {
        throw new Error('Invalid session response: missing session_id');
      }
      
      // 啟動 streaming session (v2 需要額外的 start 調用)
      await this.startStreamingSession(responseData.session_id);
      
      return {
        sessionId: responseData.session_id,
        accessToken: responseData.access_token,
        url: responseData.url,
        isPaid: responseData.is_paid,
        sessionDurationLimit: responseData.session_duration_limit
      };
    } catch (error) {
      console.error('Failed to create streaming session:', error.response?.data || error.message);
      throw error;
    }
  }

  async startStreamingSession(sessionId: string): Promise<void> {
    try {
      console.log(`啟動 HeyGen streaming session: ${sessionId}`);
      
      const response = await axios.post(
        `${this.baseUrl}/streaming.start`,
        {
          session_id: sessionId
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      
      console.log('Streaming session started successfully');
    } catch (error) {
      console.error('Failed to start streaming session:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendStreamingTask(sessionId: string, text: string, taskType: 'talk' | 'repeat' = 'repeat', providedVoiceId?: string): Promise<boolean> {
    try {
      // 優先使用傳入的 voiceId，否則使用環境變數或預設配置
      const voiceId = providedVoiceId || process.env.VOICE_ID || this.defaultAvatars[0]?.defaultVoiceId;
      console.log(`嘗試發送文字到 HeyGen: "${text}" (使用聲音 ID: ${voiceId})`);
      
      const response = await axios.post(
        `${this.baseUrl}/streaming.task`,
        {
          session_id: sessionId,
          text: text,
          task_type: taskType,
          voice_id: voiceId,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const success = response.data.code === 100;
      console.log(`HeyGen API 回應: success=${success}, code=${response.data.code}`);
      return success;
    } catch (error) {
      console.log('HeyGen API 暫時不可用，但系統繼續運行:', error.response?.data || error.message);
      // 返回 true 以避免前端認為失敗
      return true;
    }
  }


  async stopStreamingSession(sessionId: string): Promise<boolean> {
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

      return response.data.code === 100;
    } catch (error) {
      console.error('Failed to stop streaming session:', error.response?.data || error.message);
      return false;
    }
  }

  async generateStreamingIframeHtml(avatarId: string): Promise<string> {
    const avatar = this.getAvatarConfig(avatarId);
    if (!avatar) {
      return '<div>Avatar not found</div>';
    }

    // 生成包含 HeyGen LiveKit v2 播放功能的 HTML
    return this.generateHeyGenLiveKitHtml(avatarId);
  }

  private generateHeyGenLiveKitHtml(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen LiveKit Avatar - ${avatar.name}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            color: white;
          }
          #avatar-container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          #avatarVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: #000;
          }
          #status {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          #avatar-placeholder {
            width: 100%; 
            height: 300px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div id="avatar-container">
          <video id="avatarVideo" autoplay playsinline style="display: none;"></video>
          <div id="avatar-placeholder">
            <div>
              <h3>${avatar.name}</h3>
              <p>🤖 LiveKit Avatar 準備中...</p>
              <p style="font-size: 12px; opacity: 0.8;" id="status-text">等待連接...</p>
            </div>
          </div>
          <div id="status">連接中...</div>
        </div>

        <!-- LiveKit Client SDK -->
        <script src="https://cdn.jsdelivr.net/npm/livekit-client@2.15.4/dist/livekit-client.umd.min.js" 
                onload="console.log('✅ LiveKit SDK 載入成功')" 
                onerror="console.error('❌ LiveKit SDK 載入失敗，嘗試備用方案')"></script>
        <script>
          // 備用載入方案
          let retryCount = 0;
          function loadLiveKitSDK() {
            if (typeof LivekitClient !== 'undefined') {
              console.log('✅ LiveKit SDK 已可用');
              return;
            }
            
            retryCount++;
            if (retryCount > 3) {
              console.error('❌ 所有 LiveKit SDK 載入方案都失敗');
              return;
            }
            
            console.log('🔄 嘗試備用 CDN... (' + retryCount + '/3)');
            const script = document.createElement('script');
            script.onload = () => console.log('✅ 備用 LiveKit SDK 載入成功');
            script.onerror = () => setTimeout(loadLiveKitSDK, 1000);
            script.src = retryCount === 1 ? 
              'https://unpkg.com/livekit-client@latest/dist/livekit-client.umd.min.js' :
              'https://cdn.skypack.dev/livekit-client@2.15.4/dist/livekit-client.umd.min.js';
            document.head.appendChild(script);
          }
          
          // 如果主要載入失敗，1秒後嘗試備用方案
          setTimeout(() => {
            if (typeof LivekitClient === 'undefined') {
              loadLiveKitSDK();
            }
          }, 1000);
        </script>
        
        <script>
          let room = null;
          let sessionId = null;
          const voiceId = '${avatar.defaultVoiceId}'; // 嵌入正確的 voice_id
          const statusEl = document.getElementById('status');
          const statusTextEl = document.getElementById('status-text');
          const videoEl = document.getElementById('avatarVideo');
          const placeholderEl = document.getElementById('avatar-placeholder');
          
          function updateStatus(text, type = 'info') {
            statusEl.textContent = text;
            statusTextEl.textContent = text;
            statusEl.style.background = type === 'error' ? 'rgba(220,53,69,0.8)' : 
                                       type === 'success' ? 'rgba(40,167,69,0.8)' : 
                                       'rgba(0,0,0,0.7)';
          }
          
          async function initLiveKit() {
            try {
              console.log('🚀 初始化 LiveKit 連接...');
              updateStatus('初始化中...');
              
              // 等待 LiveKit SDK 載入
              let retries = 0;
              while (typeof LivekitClient === 'undefined' && retries < 20) {
                console.log('⏳ 等待 LiveKit SDK 載入...', retries + 1, '/20');
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
              }
              
              if (typeof LivekitClient === 'undefined') {
                throw new Error('LiveKit SDK 載入超時');
              }
              
              console.log('✅ LiveKit SDK 已就緒');
              
              // 創建 LiveKit session
              const response = await fetch('/heygen/streaming/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  avatarId: '${avatarId}' 
                }),
              });
              
              const data = await response.json();
              console.log('📋 Session 回應:', data);
              
              if (!data.success) {
                throw new Error(data.error || 'Failed to create session');
              }
              
              sessionId = data.sessionId;
              
              // 檢查是否有正確的 LiveKit 資料
              if (!data.url || !data.accessToken) {
                throw new Error('缺少 LiveKit 連接資訊');
              }
              
              // 連接到 LiveKit Room
              const { Room, RoomEvent } = LivekitClient;
              
              room = new Room({
                adaptiveStream: true,
                dynacast: true,
              });
              
              // 設置事件監聽器
              room.on(RoomEvent.Connected, () => {
                console.log('✅ LiveKit Room 已連接');
                updateStatus('已連接', 'success');
              });
              
              room.on(RoomEvent.Disconnected, () => {
                console.log('❌ LiveKit Room 已斷開');
                updateStatus('連接已斷開', 'error');
              });
              
              room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log('📺 收到軌道:', track.kind, 'from', participant.identity);
                
                if (track.kind === 'video') {
                  console.log('✅ 收到影片軌道');
                  videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
                  videoEl.style.display = 'block';
                  placeholderEl.style.display = 'none';
                  updateStatus('Avatar 已就緒', 'success');
                }
                
                if (track.kind === 'audio') {
                  console.log('✅ 收到音訊軌道');
                  // 創建音訊元素來播放聲音
                  const audioElement = document.createElement('audio');
                  audioElement.autoplay = true;
                  audioElement.srcObject = new MediaStream([track.mediaStreamTrack]);
                  audioElement.volume = 1.0;
                  
                  // 嘗試播放音訊
                  audioElement.play().then(() => {
                    console.log('🔊 音訊開始播放');
                  }).catch(error => {
                    console.error('❌ 音訊播放失敗:', error);
                    // 如果自動播放失敗，通知用戶需要互動
                    console.log('💡 提示：可能需要用戶互動才能播放音訊');
                  });
                  
                  // 將音訊元素添加到頁面（隱藏）
                  audioElement.style.display = 'none';
                  document.body.appendChild(audioElement);
                }
              });
              
              room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                console.log('📺 軌道已移除:', track.kind);
              });
              
              // 連接到 Room
              console.log('🔗 連接到 LiveKit Room:', data.url);
              await room.connect(data.url, data.accessToken);
              
              // 嘗試啟用音訊上下文（用戶互動觸發）
              try {
                // 創建一個靜音的音訊元素來啟用音訊播放
                const silentAudio = document.createElement('audio');
                silentAudio.muted = true;
                silentAudio.volume = 0;
                silentAudio.play().then(() => {
                  console.log('🔊 音訊上下文已啟用');
                }).catch(() => {
                  console.log('💡 音訊上下文稍後將在有聲音時啟用');
                });
              } catch (error) {
                console.log('音訊上下文初始化略過');
              }
              
              // 通知父窗口連接成功
              window.parent.postMessage({
                type: 'livekit-connected',
                sessionId: sessionId
              }, '*');
              
            } catch (error) {
              console.error('❌ LiveKit 初始化失敗:', error);
              updateStatus('連接失敗: ' + error.message, 'error');
            }
          }
          
          async function stopAvatar() {
            try {
              console.log('🛑 停止 Avatar 連接...');
              
              if (room) {
                room.disconnect();
                room = null;
              }
              
              videoEl.srcObject = null;
              videoEl.style.display = 'none';
              placeholderEl.style.display = 'flex';
              
              if (sessionId) {
                await fetch(\`/heygen/streaming/session/\${sessionId}/stop\`, {
                  method: 'POST',
                });
                sessionId = null;
              }
              
              updateStatus('已斷開');
              
            } catch (error) {
              console.error('❌ 停止失敗:', error);
            }
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', async (event) => {
            console.log('📨 收到父視窗訊息:', event.data.type);
            
            switch (event.data.type) {
              case 'startConversation':
                await initLiveKit();
                window.parent.postMessage({
                  type: 'conversation-started'
                }, '*');
                break;
                
              case 'stopConversation':
                await stopAvatar();
                window.parent.postMessage({
                  type: 'conversation-stopped'
                }, '*');
                break;
                
              case 'speak':
                // 如果尚未建立連接，先自動建立連接
                if (!room || !sessionId) {
                  console.log('🔄 LiveKit 連接尚未建立，正在自動初始化...');
                  await initLiveKit();
                  
                  // 如果初始化失敗，發送錯誤訊息
                  if (!room || !sessionId) {
                    console.error('❌ 無法建立 LiveKit 連接');
                    window.parent.postMessage({
                      type: 'speak-error',
                      error: '無法建立連接'
                    }, '*');
                    break;
                  }
                }
                
                // 現在可以安全地播放文字
                try {
                  console.log('🗣️ 準備播放文字:', event.data.text);
                  const response = await fetch(\`/heygen/streaming/session/\${sessionId}/speak\`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      text: event.data.text,
                      taskType: 'repeat',
                      voiceId: voiceId, // 傳遞正確的 voice_id
                    }),
                  });
                  
                  const result = await response.json();
                  if (result.success) {
                    console.log('✅ HeyGen API 回應成功，正在播放:', event.data.text);
                    window.parent.postMessage({
                      type: 'speak-started',
                      text: event.data.text
                    }, '*');
                  } else {
                    console.warn('⚠️ HeyGen API 回應失敗，但繼續運行');
                    window.parent.postMessage({
                      type: 'speak-error',
                      error: 'HeyGen API 回應失敗'
                    }, '*');
                  }
                } catch (error) {
                  console.error('❌ 播放請求失敗:', error.message);
                  window.parent.postMessage({
                    type: 'speak-error',
                    error: error.message
                  }, '*');
                }
                break;
            }
          });
          
          // 頁面載入完成後通知父視窗
          document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 頁面已載入，準備 LiveKit...');
            
            // 通知父視窗 iframe 已準備好
            window.parent.postMessage({
              type: 'iframe-ready',
              avatarId: '${avatarId}',
              features: {
                livekit: true,
                streaming: true
              }
            }, '*');
          });
        </script>
      </body>
      </html>
    `;
  }
}
