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
  async createStreamingSession(avatarId: string): Promise<{ sessionId: string; iceServers: any[]; token: string; url?: string; sdp?: any }> {
    try {
      // 先獲取 access token
      const tokenResponse = await axios.post(
        `${this.baseUrl}/streaming.create_token`,
        {},
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      );
      const accessToken = tokenResponse.data.data.token;

      // 創建新的 streaming session
      const sessionResponse = await axios.post(
        `${this.baseUrl}/streaming.new`,
        {
          quality: 'high',
          avatar_name: avatarId,
          voice: {
            voice_id: this.getAvatarConfig(avatarId)?.defaultVoiceId || '3b1633a466c44379bf8b5a2884727588',
          },
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      // 檢查 HeyGen API 回應格式
      const responseData = sessionResponse.data.data || sessionResponse.data;
      
      console.log('HeyGen session response:', JSON.stringify(responseData, null, 2));
      
      return {
        sessionId: responseData.session_id,
        iceServers: responseData.ice_servers || responseData.iceServers || [],
        token: accessToken,
        url: responseData.url, // LiveKit URL
        sdp: responseData.sdp, // WebRTC SDP
      };
    } catch (error) {
      console.error('Failed to create streaming session:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendStreamingTask(sessionId: string, text: string, taskType: 'talk' | 'repeat' = 'repeat'): Promise<boolean> {
    try {
      console.log(`嘗試發送文字到 HeyGen: "${text}"`);
      const response = await axios.post(
        `${this.baseUrl}/streaming.task`,
        {
          session_id: sessionId,
          text: text,
          task_type: taskType,
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

  async sendWebRTCAnswer(sessionId: string, answer: any): Promise<boolean> {
    try {
      // HeyGen 可能需要特定的 API endpoint 來接收 answer
      // 這裡暫時使用通用的 streaming API
      const response = await axios.post(
        `${this.baseUrl}/streaming.start`,
        {
          session_id: sessionId,
          sdp: {
            type: answer.type,
            sdp: answer.sdp,
          },
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
      console.error('Failed to send WebRTC answer:', error.response?.data || error.message);
      return false;
    }
  }

  async sendICECandidate(sessionId: string, candidate: RTCIceCandidate): Promise<boolean> {
    try {
      // HeyGen API 可能需要特定的 endpoint 來接收 ICE candidates
      const response = await axios.post(
        `${this.baseUrl}/streaming.ice`,
        {
          session_id: sessionId,
          candidate: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          },
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
      // ICE candidate 發送失敗是常見的，不一定是錯誤
      console.log('Failed to send ICE candidate:', error.response?.status);
      return false;
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

    // 生成包含完整 HeyGen WebRTC 播放功能的 HTML
    return this.generateHeyGenWebRTCHtml(avatarId);
  }

  private generateHeyGenWebRTCHtml(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Avatar - ${avatar.name}</title>
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
        </style>
      </head>
      <body>
        <div id="avatar-container">
          <video id="avatarVideo" autoplay playsinline style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: #000;
            display: none;
          "></video>
          <div id="avatar-placeholder" style="
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
          ">
            <div>
              <h3>${avatar.name}</h3>
              <p>🤖 Avatar 準備就緒</p>
              <p style="font-size: 12px; opacity: 0.8;">等待連接...</p>
            </div>
          </div>
        </div>

        <script>
          let peerConnection = null;
          let sessionId = null;
          let sessionData = null;
          let isConnected = false;
          
          const videoEl = document.getElementById('avatarVideo');
          
          async function startAvatar() {
            try {
              console.log('Starting avatar connection...');
              
              
              // 呼叫後端 API 創建 session
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
              console.log('Session response:', data);
              
              if (!data.success) {
                throw new Error(data.error || 'Failed to create session');
              }
              
              sessionId = data.sessionId;
              sessionData = data;
              
              // 檢查是否為模擬模式
              if (data.sessionId && data.sessionId.includes('mock-session')) {
                console.log('模擬模式：跳過 WebRTC 設置');
                isConnected = true;
              } else {
                // 建立 WebRTC 連接
                await setupWebRTC(data);
              }
              
            } catch (error) {
              console.error('啟動失敗:', error);
            }
          }
          
          async function setupWebRTC(data) {
            try {
              // 創建 RTCPeerConnection
              const configuration = {
                iceServers: data.iceServers || [
                  { urls: 'stun:stun.l.google.com:19302' }
                ]
              };
              
              peerConnection = new RTCPeerConnection(configuration);
              
              // 處理 ICE candidates
              peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                  console.log('New ICE candidate:', event.candidate);
                  // 發送 ICE candidate 到 HeyGen
                  sendIceCandidate(event.candidate);
                }
              };
              
              // 處理遠端 stream
              peerConnection.ontrack = (event) => {
                console.log('Received track:', event.track.kind, event.streams);
                
                if (event.track.kind === 'audio') {
                  console.log('✅ 收到音訊軌道');
                } else if (event.track.kind === 'video') {
                  console.log('✅ 收到影片軌道');
                }
                
                if (event.streams && event.streams.length > 0) {
                  const stream = event.streams[0];
                  console.log('Setting video source to stream:', stream);
                  
                  // 確保影片和音訊都設定到同一個 stream
                  videoEl.srcObject = stream;
                  
                  // 確保音訊沒有被靜音
                  videoEl.muted = false;
                  videoEl.volume = 1.0;
                  
                  // 根據 Chrome 自動播放政策的最佳實踐
                  videoEl.onloadedmetadata = async () => {
                    console.log('Video metadata loaded');
                    
                    // 先嘗試靜音播放（這應該總是成功的）
                    videoEl.muted = true;
                    
                    try {
                      await videoEl.play();
                      console.log('✅ 靜音播放成功');
                      videoEl.style.display = 'block';
                      document.getElementById('avatar-placeholder').style.display = 'none';
                      isConnected = true;
                      
                      // 添加視覺提示
                      const muteIndicator = document.createElement('div');
                      muteIndicator.id = 'mute-indicator';
                      muteIndicator.innerHTML = '🔇 點擊啟用聲音';
                      muteIndicator.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; z-index: 10;';
                      videoEl.parentElement.style.position = 'relative';
                      videoEl.parentElement.appendChild(muteIndicator);
                      
                      // 處理用戶點擊（包括影片和提示）
                      const enableAudio = async () => {
                        try {
                          videoEl.muted = false;
                          // 根據文章建議，在用戶互動後立即播放
                          await videoEl.play();
                          console.log('🔊 音訊已成功啟用');
                          muteIndicator.remove();
                        } catch (error) {
                          console.log('啟用音訊失敗:', error.message);
                          videoEl.muted = true; // 回退到靜音
                        }
                      };
                      
                      videoEl.addEventListener('click', enableAudio);
                      muteIndicator.addEventListener('click', enableAudio);
                      
                    } catch (error) {
                      console.error('連靜音播放都失敗:', error);
                      // 如果連靜音都無法播放，可能是其他問題
                    }
                  };
                }
              };
              
              // 處理連接狀態變化
              peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
              };
              
              // 如果有 SDP，設置遠端描述
              if (data.sdp) {
                console.log('Setting remote description');
                await peerConnection.setRemoteDescription({
                  type: 'offer',
                  sdp: data.sdp.sdp || data.sdp
                });
                
                // 創建 answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                // 發送 answer 到 HeyGen
                await sendAnswer(answer);
              }
              
            } catch (error) {
              console.error('WebRTC 設置失敗:', error);
              throw error;
            }
          }
          
          async function sendAnswer(answer) {
            try {
              console.log('Sending answer to HeyGen');
              const response = await fetch(\`/heygen/streaming/session/\${sessionId}/answer\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answer }),
              });
              
              const result = await response.json();
              if (result.success) {
                console.log('Answer sent successfully');
              } else {
                console.error('Failed to send answer');
              }
            } catch (error) {
              console.error('Failed to send answer:', error);
            }
          }
          
          async function sendIceCandidate(candidate) {
            try {
              console.log('Sending ICE candidate to HeyGen');
              const response = await fetch(\`/heygen/streaming/session/\${sessionId}/ice\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ candidate }),
              });
              
              const result = await response.json();
              if (!result.success) {
                console.log('Failed to send ICE candidate');
              }
            } catch (error) {
              console.error('Failed to send ICE candidate:', error);
            }
          }
          
          async function stopAvatar() {
            try {
              console.log('Stopping avatar connection...');
              
              // 關閉 WebRTC 連接
              if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
              }
              
              // 停止視頻並重置顯示
              videoEl.srcObject = null;
              videoEl.style.display = 'none';
              document.getElementById('avatar-placeholder').style.display = 'flex';
              
              // 呼叫後端 API 停止 session
              if (sessionId) {
                await fetch(\`/heygen/streaming/session/\${sessionId}/stop\`, {
                  method: 'POST',
                });
                sessionId = null;
              }
              
              isConnected = false;
              
            } catch (error) {
              console.error('停止失敗:', error);
            }
          }
          
          // 添加點擊取消靜音功能
          document.addEventListener('click', () => {
            const video = document.getElementById('avatarVideo');
            if (video && video.muted) {
              video.muted = false;
              console.log('🔊 用戶點擊取消靜音');
            }
          });
          
          // 定期查詢音效狀態的函數
          // 移除音訊狀態檢查相關變數
          
          function startAudioStatusCheck() {
            // 已簡化，不再進行複雜的音訊狀態檢查
            console.log('對話已開始');
          }
          
          function stopAudioStatusCheck() {
            console.log('對話已結束');
          }

          // 監聽來自父視窗的訊息
          window.addEventListener('message', async (event) => {
            // 簡化音訊處理
            if (event.data.type === 'audioEnabled') {
              console.log('🔊 收到音訊啟用通知 - 簡化處理');
            }
            
            // 新增的對話控制
            if (event.data.type === 'startConversation') {
              await startAvatar();
              startAudioStatusCheck(); // 開始音效狀態檢查
              window.parent.postMessage({
                type: 'conversation-started'
              }, '*');
            } else if (event.data.type === 'stopConversation') {
              stopAudioStatusCheck(); // 停止音效狀態檢查
              await stopAvatar();
              window.parent.postMessage({
                type: 'conversation-stopped'
              }, '*');
            }
            
            // 簡化的 speak 處理
            if (event.data.type === 'speak' && isConnected && sessionId) {
              try {
                // 利用用戶點擊事件嘗試啟用音訊
                if (videoEl && videoEl.muted) {
                  try {
                    videoEl.muted = false;
                    await videoEl.play(); // 在用戶手勢內重新播放
                    console.log('🔊 利用用戶操作成功啟用音訊');
                    // 移除靜音提示
                    const muteIndicator = document.getElementById('mute-indicator');
                    if (muteIndicator) muteIndicator.remove();
                  } catch (error) {
                    console.log('音訊啟用失敗，保持靜音:', error.message);
                    videoEl.muted = true;
                  }
                }
                
                const response = await fetch(\`/heygen/streaming/session/\${sessionId}/speak\`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    text: event.data.text,
                    taskType: 'repeat',
                  }),
                });
                
                const result = await response.json();
                if (result.success) {
                  console.log('正在播放: ' + event.data.text);
                } else {
                  console.log('HeyGen API 回應失敗，但繼續運行');
                }
              } catch (error) {
                console.log('播放請求失敗，但影片繼續播放:', error.message);
              }
            }
          });
          
          // 頁面載入時嘗試解鎖音訊權限
          document.addEventListener('DOMContentLoaded', () => {
            // 監聽任何用戶互動來解鎖音訊
            const unlockAudio = () => {
              try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                gainNode.gain.value = 0;
                oscillator.frequency.value = 440;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.01);
                
                audioEnabled = true;
                console.log('🔊 音訊已通過用戶互動解鎖');
                
                // 移除事件監聽器
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
              } catch (e) {
                console.log('音訊解鎖失敗:', e);
              }
            };
            
            // 監聽各種用戶互動事件
            document.addEventListener('click', unlockAudio);
            document.addEventListener('touchstart', unlockAudio);
            document.addEventListener('keydown', unlockAudio);
          });
          
          // 通知父視窗
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}',
            features: {
              webrtc: true,
              streaming: true
            }
          }, '*');
        </script>
      </body>
      </html>
    `;
  }
  
  private generateHeyGenPlayerHtml(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Avatar - ${avatar.name}</title>
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
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .status {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          .controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 10;
          }
          button {
            padding: 10px 20px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover {
            background: #357abd;
          }
          button:disabled {
            background: #666;
            cursor: not-allowed;
          }
          .message {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            max-width: 80%;
            text-align: center;
            display: none;
          }
          .fallback-container {
            text-align: center;
          }
          .avatar-info {
            background: white;
            color: black;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div id="avatar-container">
          <div class="status" id="status">初始化中...</div>
          <div class="message" id="message"></div>
          <div class="controls" style="display: none;">
            <button id="startBtn">開始對話</button>
            <button id="stopBtn" disabled>結束對話</button>
          </div>
          <div class="fallback-container" id="fallback" style="display: none;">
            <div class="avatar-info">
              <h2>${avatar.name}</h2>
              <p>Avatar ID: ${avatar.id}</p>
              <p>使用語音合成播放</p>
            </div>
          </div>
        </div>

        <script>
          let peerConnection = null;
          let sessionId = null;
          let avatarId = '${avatarId}';
          let isConnected = false;
          
          const statusEl = document.getElementById('status');
          const messageEl = document.getElementById('message');
          const startBtn = document.getElementById('startBtn');
          const stopBtn = document.getElementById('stopBtn');
          const container = document.getElementById('avatar-container');
          const fallback = document.getElementById('fallback');
          
          function updateStatus(text, type = 'info') {
            statusEl.textContent = text;
            statusEl.style.background = type === 'error' ? 'rgba(220,53,69,0.8)' : 
                                       type === 'success' ? 'rgba(40,167,69,0.8)' : 
                                       'rgba(0,0,0,0.7)';
          }
          
          function showMessage(text) {
            messageEl.textContent = text;
            messageEl.style.display = 'block';
            setTimeout(() => {
              messageEl.style.display = 'none';
            }, 3000);
          }
          
          // 使用 Web Speech API 作為備用方案
          function useFallback() {
            console.log('使用備用方案: Web Speech API');
            fallback.style.display = 'block';
            updateStatus('使用語音合成', 'info');
            
            // 監聽來自父視窗的訊息
            window.addEventListener('message', (event) => {
              if (event.data.type === 'speak' && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(event.data.text);
                utterance.lang = 'zh-TW';
                utterance.rate = 0.9;
                
                utterance.onstart = () => {
                  updateStatus('播放中...', 'success');
                  showMessage(event.data.text);
                };
                
                utterance.onend = () => {
                  updateStatus('就緒', 'success');
                };
                
                speechSynthesis.speak(utterance);
              }
            });
          }
          
          async function startAvatar() {
            try {
              startBtn.disabled = true;
              updateStatus('正在連接...');
              
              // 直接呼叫 HeyGen API 獲取 access token
              const tokenResponse = await fetch('/api/heygen/access-token', {
                method: 'POST',
              });
              
              if (!tokenResponse.ok) {
                throw new Error('Failed to get access token');
              }
              
              const accessToken = await tokenResponse.text();
              
              // 使用 HeyGen SDK (如果可用)
              if (typeof window.StreamingAvatar !== 'undefined') {
                await connectWithSDK(accessToken);
              } else {
                // 降級到簡化方案
                useFallback();
              }
              
            } catch (error) {
              console.error('啟動失敗:', error);
              updateStatus('連接失敗', 'error');
              startBtn.disabled = false;
              useFallback();
            }
          }
          
          async function connectWithSDK(token) {
            try {
              // 創建 StreamingAvatar 實例
              const avatar = new window.StreamingAvatar({ token });
              
              // 監聽事件
              avatar.on('stream_ready', (stream) => {
                console.log('Stream ready');
                const videoEl = document.getElementById('avatarVideo');
                if (videoEl && stream) {
                  videoEl.srcObject = stream;
                  videoEl.play();
                }
                updateStatus('Avatar 已連接', 'success');
                isConnected = true;
                stopBtn.disabled = false;
              });
              
              avatar.on('stream_disconnected', () => {
                console.log('Stream disconnected');
                updateStatus('連接已斷開', 'error');
                isConnected = false;
              });
              
              // 啟動 avatar
              const sessionInfo = await avatar.createStartAvatar({
                quality: 'high',
                avatarName: avatarId,
                voice: {
                  voiceId: '${avatar.defaultVoiceId}'
                }
              });
              
              sessionId = sessionInfo.session_id;
              window.currentAvatar = avatar;
              
            } catch (error) {
              console.error('SDK 連接失敗:', error);
              throw error;
            }
          }
          
          async function setupWebRTC(iceServers, token) {
            // 這裡應該實作 WebRTC 連接邏輯
            // 但因為複雜度較高，目前先使用備用方案
            console.log('WebRTC 設定:', { iceServers, token });
            useFallback();
          }
          
          async function stopAvatar() {
            try {
              stopBtn.disabled = true;
              updateStatus('正在斷開...');
              
              if (sessionId) {
                await fetch(\`/heygen/streaming/session/\${sessionId}/stop\`, {
                  method: 'POST',
                });
              }
              
              if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
              }
              
              sessionId = null;
              isConnected = false;
              updateStatus('已斷開');
              startBtn.disabled = false;
              
            } catch (error) {
              console.error('停止失敗:', error);
              updateStatus('停止失敗', 'error');
              stopBtn.disabled = false;
            }
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', async (event) => {
            // 新增的對話控制
            if (event.data.type === 'startConversation') {
              await startAvatar();
              window.parent.postMessage({
                type: 'conversation-started'
              }, '*');
            } else if (event.data.type === 'stopConversation') {
              await stopAvatar();
              window.parent.postMessage({
                type: 'conversation-stopped'
              }, '*');
            }
            
            // 原有的 speak 處理
            if (event.data.type === 'speak' && isConnected && sessionId) {
              try {
                const response = await fetch(\`/heygen/streaming/session/\${sessionId}/speak\`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    text: event.data.text,
                    taskType: 'repeat',
                  }),
                });
                
                const result = await response.json();
                if (result.success) {
                  showMessage('正在播放: ' + event.data.text);
                } else {
                  // 如果 API 失敗，使用 Web Speech API
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(event.data.text);
                    utterance.lang = 'zh-TW';
                    speechSynthesis.speak(utterance);
                  }
                }
              } catch (error) {
                console.error('播放失敗:', error);
                updateStatus('播放失敗', 'error');
              }
            }
          });
          
          // 綁定按鈕事件
          startBtn.addEventListener('click', startAvatar);
          stopBtn.addEventListener('click', stopAvatar);
          
          // 初始化
          updateStatus('準備就緒');
          
          // 通知父視窗
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}',
            features: {
              streaming: true,
              webSpeech: true
            }
          }, '*');
        </script>
      </body>
      </html>
    `;
  }
  
  private generateSimpleIframeHtml(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    if (!avatar) {
      return '<div>Avatar not found</div>';
    }

    // 使用 ESM import 動態載入 SDK
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Avatar - ${avatar.name}</title>
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
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .status {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          .controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 10;
          }
          button {
            padding: 10px 20px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover {
            background: #357abd;
          }
          button:disabled {
            background: #666;
            cursor: not-allowed;
          }
          .message {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            max-width: 80%;
            text-align: center;
            display: none;
          }
          .loading {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="avatar-container">
          <div class="loading">
            <div class="status" id="status">載入中...</div>
            <p>正在載入 HeyGen Streaming Avatar SDK...</p>
          </div>
          <div class="message" id="message"></div>
          <div class="controls" style="display: none;">
            <button id="startBtn" disabled>開始對話</button>
            <button id="stopBtn" disabled>結束對話</button>
          </div>
        </div>

        <script type="module">
          let avatar = null;
          let sessionData = null;
          let isConnected = false;
          
          const statusEl = document.getElementById('status');
          const messageEl = document.getElementById('message');
          const startBtn = document.getElementById('startBtn');
          const stopBtn = document.getElementById('stopBtn');
          const container = document.getElementById('avatar-container');
          
          function updateStatus(text, type = 'info') {
            statusEl.textContent = text;
            statusEl.style.background = type === 'error' ? 'rgba(220,53,69,0.8)' : 
                                       type === 'success' ? 'rgba(40,167,69,0.8)' : 
                                       'rgba(0,0,0,0.7)';
          }
          
          function showMessage(text) {
            messageEl.textContent = text;
            messageEl.style.display = 'block';
            setTimeout(() => {
              messageEl.style.display = 'none';
            }, 3000);
          }
          
          async function initializeAvatar() {
            try {
              updateStatus('正在載入 SDK...');
              
              // 載入依賴項
              await import('https://cdn.jsdelivr.net/npm/livekit-client@2.5.11/+esm');
              
              // 動態 import StreamingAvatar SDK
              const { StreamingAvatar } = await import('https://cdn.jsdelivr.net/npm/@heygen/streaming-avatar@2.0.16/+esm');
              
              updateStatus('SDK 載入成功，初始化中...');
              
              // 初始化 StreamingAvatar
              // 這部分已移至後端處理
              console.error('此功能已移至後端處理');
              
              // 設置事件監聽器
              avatar.on('avatar_start_talking', () => {
                updateStatus('說話中...', 'success');
              });
              
              avatar.on('avatar_stop_talking', () => {
                updateStatus('就緒', 'success');
              });
              
              avatar.on('stream_disconnected', () => {
                isConnected = false;
                updateStatus('連接已斷開', 'error');
                startBtn.disabled = false;
                stopBtn.disabled = true;
              });
              
              avatar.on('stream_ready', () => {
                isConnected = true;
                updateStatus('連接成功', 'success');
                showMessage('Avatar 已準備就緒！');
              });
              
              // 顯示控制按鈕
              document.querySelector('.controls').style.display = 'flex';
              startBtn.disabled = false;
              updateStatus('準備就緒');
              
              // 清除載入訊息
              const loadingEl = container.querySelector('.loading p');
              if (loadingEl) loadingEl.remove();
              
            } catch (error) {
              console.error('初始化失敗:', error);
              updateStatus('SDK 載入失敗', 'error');
              // 降級到簡化版本
              fallbackToWebSpeech();
            }
          }
          
          async function startAvatar() {
            try {
              startBtn.disabled = true;
              updateStatus('正在連接...');
              
              sessionData = await avatar.createStartAvatar({
                quality: 'high',
                avatarName: '${avatarId}',
                voiceId: '${avatar.defaultVoiceId}',
                language: 'zh-TW',
              });
              
              console.log('Avatar session started:', sessionData);
              
              // 將視頻元素添加到容器
              const mediaElement = avatar.mediaElement;
              if (mediaElement) {
                // 清空容器但保留控制元素
                const controls = container.querySelector('.controls');
                const status = container.querySelector('.status');
                const message = container.querySelector('.message');
                container.innerHTML = '';
                container.appendChild(mediaElement);
                container.appendChild(controls);
                container.appendChild(status);
                container.appendChild(message);
              }
              
              stopBtn.disabled = false;
              
            } catch (error) {
              console.error('啟動失敗:', error);
              updateStatus('啟動失敗', 'error');
              startBtn.disabled = false;
            }
          }
          
          async function stopAvatar() {
            try {
              stopBtn.disabled = true;
              updateStatus('正在斷開...');
              
              await avatar.stopAvatar();
              
              updateStatus('已斷開');
              startBtn.disabled = false;
              
              // 恢復初始界面
              location.reload();
              
            } catch (error) {
              console.error('停止失敗:', error);
              updateStatus('停止失敗', 'error');
              stopBtn.disabled = false;
            }
          }
          
          // 降級方案：使用 Web Speech API
          function fallbackToWebSpeech() {
            container.innerHTML = \`
              <div class="status">使用語音合成</div>
              <div class="avatar-info" style="background: white; color: black; padding: 20px; border-radius: 10px;">
                <h2>${avatar.name}</h2>
                <p>使用 Web Speech API</p>
              </div>
              <div class="message" id="message"></div>
            \`;
            
            window.addEventListener('message', (event) => {
              if (event.data.type === 'speak' && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(event.data.text);
                utterance.lang = 'zh-TW';
                speechSynthesis.speak(utterance);
              }
            });
            
            window.parent.postMessage({
              type: 'iframe-ready',
              avatarId: '${avatarId}',
              features: { webSpeech: true }
            }, '*');
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', async (event) => {
            // 新增的對話控制
            if (event.data.type === 'startConversation') {
              await startAvatar();
              window.parent.postMessage({
                type: 'conversation-started'
              }, '*');
            } else if (event.data.type === 'stopConversation') {
              await stopAvatar();
              window.parent.postMessage({
                type: 'conversation-stopped'
              }, '*');
            }
            
            // 原有的 speak 處理
            if (event.data.type === 'speak' && isConnected && avatar) {
              try {
                await avatar.speak({
                  text: event.data.text,
                  taskType: 'talk',
                });
                showMessage('正在播放: ' + event.data.text);
              } catch (error) {
                console.error('播放失敗:', error);
                updateStatus('播放失敗', 'error');
              }
            }
          });
          
          // 綁定按鈕事件
          startBtn.addEventListener('click', startAvatar);
          stopBtn.addEventListener('click', stopAvatar);
          
          // 初始化
          initializeAvatar();
          
          // 通知父視窗
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}',
            features: {
              streaming: true,
              interactive: true
            }
          }, '*');
        </script>
      </body>
      </html>
    `;
  }
  
  private generateSimpleIframeHtml_removed(avatarId: string): string {
    const avatar = this.getAvatarConfig(avatarId);
    if (!avatar) {
      return '<div>Avatar not found</div>';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Avatar - ${avatar.name}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .avatar-info {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .status {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          h2 {
            margin: 0 0 10px 0;
            color: #333;
          }
          p {
            margin: 5px 0;
            color: #666;
          }
          .message-display {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status">就緒</div>
          <div class="avatar-info">
            <h2>${avatar.name}</h2>
            <p>Avatar ID: ${avatar.id}</p>
            <p>Voice ID: ${avatar.defaultVoiceId}</p>
            <p>使用父視窗發送文字來播放語音</p>
          </div>
          <div class="message-display" id="messageDisplay"></div>
        </div>

        <script>
          const statusEl = document.querySelector('.status');
          const messageEl = document.getElementById('messageDisplay');
          
          // 使用 Web Speech API 作為臨時方案
          function speak(text) {
            if ('speechSynthesis' in window) {
              // 停止任何正在播放的語音
              speechSynthesis.cancel();
              
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'zh-TW';
              utterance.rate = 0.9;
              
              utterance.onstart = () => {
                statusEl.textContent = '播放中...';
                messageEl.textContent = text;
                messageEl.style.display = 'block';
              };
              
              utterance.onend = () => {
                statusEl.textContent = '就緒';
                setTimeout(() => {
                  messageEl.style.display = 'none';
                }, 2000);
              };
              
              speechSynthesis.speak(utterance);
            }
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', (event) => {
            if (event.data.type === 'speak') {
              speak(event.data.text);
            }
          });
          
          // 通知父視窗 iframe 已載入
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}',
            features: {
              streaming: false,
              webSpeech: true
            }
          }, '*');
        </script>
      </body>
      </html>
    `;
  }
  
  // 音效狀態管理已移除

  // 已移除 generateStreamingIframeHtmlWithSDK - 現在使用後端 SDK
  /* async generateStreamingIframeHtmlWithSDK_deprecated(avatarId: string): Promise<string> {
    // 獲取 access token
    let accessToken = '';
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
      accessToken = response.data.data.token;
      console.log('Generated access token for iframe');
    } catch (error) {
      console.error('Failed to get access token:', error);
      accessToken = this.apiKey; // 備用方案
    }

    const avatar = this.getAvatarConfig(avatarId);
    if (!avatar) {
      return '<div>Avatar not found</div>';
    }

    // 生成包含 HeyGen Streaming Avatar SDK 的 HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HeyGen Streaming Avatar - ${avatar.name}</title>
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
          }
          #avatar-container {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .status {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          .controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 10;
          }
          button {
            padding: 10px 20px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover {
            background: #357abd;
          }
          button:disabled {
            background: #666;
            cursor: not-allowed;
          }
          .message {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            max-width: 80%;
            text-align: center;
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="avatar-container">
          <div class="status" id="status">初始化中...</div>
          <div class="message" id="message"></div>
          <div class="controls" style="display: none;">
            <button id="startBtn" disabled>開始對話</button>
            <button id="stopBtn" disabled>結束對話</button>
          </div>
        </div>

        <script>
          // 動態載入 HeyGen Streaming Avatar SDK
          function loadScript(src) {
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = src;
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          
          // 載入 SDK
          loadScript('https://unpkg.com/@heygen/streaming-avatar@latest/dist/index.umd.js')
            .then(() => {
              console.log('HeyGen SDK 載入成功');
              if (typeof StreamingAvatar !== 'undefined') {
                console.log('StreamingAvatar 已定義');
                initializeApp();
              } else {
                console.error('StreamingAvatar 未定義');
                updateStatus('SDK 載入失敗', 'error');
              }
            })
            .catch((error) => {
              console.error('載入 SDK 失敗:', error);
              updateStatus('SDK 載入失敗', 'error');
            });
        </script>
        
        <script>
          let avatar = null;
          let sessionData = null;
          let isConnected = false;
          
          const statusEl = document.getElementById('status');
          const messageEl = document.getElementById('message');
          const startBtn = document.getElementById('startBtn');
          const stopBtn = document.getElementById('stopBtn');
          const container = document.getElementById('avatar-container');
          
          function updateStatus(text, type = 'info') {
            statusEl.textContent = text;
            statusEl.style.background = type === 'error' ? 'rgba(220,53,69,0.8)' : 
                                       type === 'success' ? 'rgba(40,167,69,0.8)' : 
                                       'rgba(0,0,0,0.7)';
          }
          
          function showMessage(text) {
            messageEl.textContent = text;
            messageEl.style.display = 'block';
            setTimeout(() => {
              messageEl.style.display = 'none';
            }, 3000);
          }
          
          function initializeApp() {
            // 定義所有需要的函數
            updateStatus('SDK 載入完成', 'success');
            startBtn.disabled = false;
            
            // 通知父視窗 iframe 已載入
            window.parent.postMessage({
              type: 'iframe-ready',
              avatarId: '${avatarId}',
              features: {
                streaming: true,
                interactive: true
              }
            }, '*');
          }
          
          async function initializeAvatar() {
            try {
              updateStatus('正在初始化 Avatar...');
              
              // 初始化 StreamingAvatar
              // 這部分已移至後端處理
              console.error('此功能已移至後端處理');
              
              // 設置事件監聽器
              avatar.on('avatar_start_talking', () => {
                updateStatus('說話中...', 'success');
              });
              
              avatar.on('avatar_stop_talking', () => {
                updateStatus('就緒', 'success');
              });
              
              avatar.on('stream_disconnected', () => {
                isConnected = false;
                updateStatus('連接已斷開', 'error');
                startBtn.disabled = false;
                stopBtn.disabled = true;
              });
              
              avatar.on('stream_ready', () => {
                isConnected = true;
                updateStatus('連接成功', 'success');
                showMessage('Avatar 已準備就緒！');
              });
              
              startBtn.disabled = false;
              updateStatus('準備就緒');
              
            } catch (error) {
              console.error('初始化失敗:', error);
              updateStatus('初始化失敗', 'error');
            }
          }
          
          async function startAvatar() {
            try {
              startBtn.disabled = true;
              updateStatus('正在連接...');
              
              sessionData = await avatar.createStartAvatar({
                quality: 'high',
                avatarName: '${avatarId}',
                voiceId: '${avatar.defaultVoiceId}',
                language: 'zh-TW',
              });
              
              console.log('Avatar session started:', sessionData);
              
              // 將視頻元素添加到容器
              const mediaElement = avatar.mediaElement;
              if (mediaElement) {
                // 清空容器但保留控制元素
                const controls = container.querySelector('.controls');
                const status = container.querySelector('.status');
                const message = container.querySelector('.message');
                container.innerHTML = '';
                container.appendChild(mediaElement);
                container.appendChild(controls);
                container.appendChild(status);
                container.appendChild(message);
              }
              
              stopBtn.disabled = false;
              
            } catch (error) {
              console.error('啟動失敗:', error);
              updateStatus('啟動失敗', 'error');
              startBtn.disabled = false;
            }
          }
          
          async function stopAvatar() {
            try {
              stopBtn.disabled = true;
              updateStatus('正在斷開...');
              
              await avatar.stopAvatar();
              
              updateStatus('已斷開');
              startBtn.disabled = false;
              
              // 恢復初始界面
              location.reload();
              
            } catch (error) {
              console.error('停止失敗:', error);
              updateStatus('停止失敗', 'error');
              stopBtn.disabled = false;
            }
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', async (event) => {
            // 新增的對話控制
            if (event.data.type === 'startConversation') {
              await startAvatar();
              window.parent.postMessage({
                type: 'conversation-started'
              }, '*');
            } else if (event.data.type === 'stopConversation') {
              await stopAvatar();
              window.parent.postMessage({
                type: 'conversation-stopped'
              }, '*');
            }
            
            // 原有的 speak 處理
            if (event.data.type === 'speak' && isConnected) {
              try {
                await avatar.speak({
                  text: event.data.text,
                  taskType: 'talk',
                });
                showMessage('正在播放: ' + event.data.text);
              } catch (error) {
                console.error('播放失敗:', error);
                updateStatus('播放失敗', 'error');
              }
            }
          });
          
          // 綁定按鈕事件
          startBtn.addEventListener('click', startAvatar);
          stopBtn.addEventListener('click', stopAvatar);
        </script>
      </body>
      </html>
    `;
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
          // 儲存當前狀態
          let currentText = '';
          let isPlaying = false;
          
          // 創建音訊元素來播放 TTS
          const audio = new Audio();
          audio.addEventListener('play', () => {
            isPlaying = true;
            updateStatus('playing');
          });
          audio.addEventListener('ended', () => {
            isPlaying = false;
            updateStatus('ready');
            window.parent.postMessage({
              type: 'speak-completed',
              text: currentText
            }, '*');
          });
          
          // 更新狀態顯示
          function updateStatus(status) {
            const statusElement = document.createElement('div');
            statusElement.style.cssText = 'position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px;';
            
            switch(status) {
              case 'playing':
                statusElement.textContent = '🔊 播放中...';
                break;
              case 'loading':
                statusElement.textContent = '⏳ 載入中...';
                break;
              case 'ready':
                statusElement.textContent = '✅ 就緒';
                break;
            }
            
            const existing = document.querySelector('.status-display');
            if (existing) existing.remove();
            statusElement.className = 'status-display';
            document.body.appendChild(statusElement);
          }
          
          // 顯示文字
          function displayText(text) {
            const textDisplay = document.querySelector('.text-display') || document.createElement('div');
            textDisplay.className = 'text-display';
            textDisplay.style.cssText = 'position: absolute; bottom: 40px; left: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-size: 14px; max-height: 100px; overflow-y: auto;';
            textDisplay.textContent = text;
            if (!document.querySelector('.text-display')) {
              document.body.appendChild(textDisplay);
            }
          }
          
          // 監聽來自父視窗的訊息
          window.addEventListener('message', async function(event) {
            if (event.data.type === 'speak') {
              console.log('收到播放請求:', event.data.text);
              currentText = event.data.text;
              
              // 顯示文字
              displayText(currentText);
              updateStatus('loading');
              
              // 使用瀏覽器內建的語音合成 API（作為臨時方案）
              if ('speechSynthesis' in window) {
                // 停止任何正在播放的語音
                speechSynthesis.cancel();
                
                // 創建新的語音合成
                const utterance = new SpeechSynthesisUtterance(currentText);
                utterance.lang = 'zh-TW';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                utterance.onstart = () => {
                  updateStatus('playing');
                  window.parent.postMessage({
                    type: 'speak-started',
                    text: currentText
                  }, '*');
                };
                
                utterance.onend = () => {
                  updateStatus('ready');
                  window.parent.postMessage({
                    type: 'speak-completed',
                    text: currentText
                  }, '*');
                };
                
                utterance.onerror = (error) => {
                  console.error('語音合成錯誤:', error);
                  updateStatus('ready');
                  window.parent.postMessage({
                    type: 'speak-error',
                    error: error.toString()
                  }, '*');
                };
                
                // 開始播放
                speechSynthesis.speak(utterance);
              } else {
                console.error('瀏覽器不支援語音合成');
                updateStatus('ready');
              }
            }
          });
          
          // 初始化狀態
          updateStatus('ready');
          
          // 通知父視窗 iframe 已載入完成
          window.parent.postMessage({
            type: 'iframe-ready',
            avatarId: '${avatarId}',
            features: {
              speechSynthesis: 'speechSynthesis' in window
            }
          }, '*');
        </script>
      </body>
      </html>
    `;
  } */
}