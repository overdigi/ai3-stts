import { io, Socket } from 'socket.io-client';
import StreamingAvatar, { AvatarQuality, StreamingEvents, VoiceChatTransport, VoiceEmotion, StartAvatarRequest, STTProvider, TaskMode, TaskType } from '@heygen/streaming-avatar';

// LiveKit types (will be available globally via CDN)
declare global {
  interface Window {
    LivekitClient: any;
  }
}

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

export interface HeyGenDirectSession {
  sessionId: string;
  isActive: boolean;
  speak(text: string): Promise<{ success: boolean; error?: string }>;
  stop(): Promise<{ success: boolean; error?: string }>;
  onSessionUpdate?: (status: HeyGenSessionStatus) => void;
}

export interface HeyGenSessionStatus {
  sessionId: string;
  status: 'idle' | 'initializing' | 'ready' | 'speaking' | 'error' | 'stopped';
  message?: string;
  error?: string;
}

export interface HeyGenPlayerOptions {
  container: HTMLElement;
  sessionId: string;
  livekitUrl?: string;
  livekitToken?: string;
  livekitIceServers?: any[];
  realtimeEndpoint?: string; // HeyGen's realtime WebRTC endpoint
}

export class HeyGenPlayer {
  private room: any; // LiveKit Room
  private container: HTMLElement;
  private videoElement: HTMLVideoElement | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isConnected: boolean = false;
  private realtimeEndpoint?: string;

  constructor(options: HeyGenPlayerOptions) {
    this.container = options.container;
    this.realtimeEndpoint = options.realtimeEndpoint;
    
    // 立即創建視頻和音頻元素
    this.createMediaElements();
    
    // 如果有 realtime_endpoint，使用 HeyGen 的 WebRTC 方式
    if (this.realtimeEndpoint) {
      console.log('[HeyGenPlayer] 使用 HeyGen realtime endpoint:', this.realtimeEndpoint);
      this.initializeHeyGenWebRTC();
    } else {
      // 否則使用 LiveKit 方式
      console.log('[HeyGenPlayer] 使用 LiveKit 方式');
      this.tryInitializeLiveKit(options);
    }
  }

  private async tryInitializeLiveKit(options: HeyGenPlayerOptions) {
    // 立即嘗試
    if (typeof window !== 'undefined' && window.LivekitClient) {
      await this.initializeLiveKit(options);
      return;
    }

    // 延遲嘗試
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (typeof window !== 'undefined' && window.LivekitClient) {
        console.log('[HeyGenPlayer] LiveKit SDK 延遲載入成功');
        await this.initializeLiveKit(options);
        return;
      }
    }

    console.error('[HeyGenPlayer] LiveKit Client SDK 載入失敗，5秒後放棄');
    // 提供一個簡單的顯示界面
    this.showNoLiveKitMessage();
  }

  private createMediaElements() {
    // 查找或創建 video 元素
    this.videoElement = this.container.querySelector('#heygen-video') as HTMLVideoElement;
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.id = 'heygen-video';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = '100%';
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = false;
      this.container.appendChild(this.videoElement);
    }

    // 查找或創建 audio 元素
    this.audioElement = this.container.querySelector('#heygen-audio') as HTMLAudioElement;
    if (!this.audioElement) {
      this.audioElement = document.createElement('audio');
      this.audioElement.id = 'heygen-audio';
      this.audioElement.autoplay = true;
      this.container.appendChild(this.audioElement);
    }

    // 隱藏載入畫面並顯示視頻元素
    const loadingElement = this.container.querySelector('#heygen-loading');
    if (loadingElement) {
      (loadingElement as HTMLElement).style.display = 'none';
    }
    
    // 立即顯示視頻元素（即使沒有流）
    if (this.videoElement) {
      this.videoElement.style.display = 'block';
    }

    console.log('[HeyGenPlayer] 媒體元素已創建並顯示');
  }

  private async initializeHeyGenWebRTC() {
    try {
      console.log('[HeyGenPlayer] 初始化 HeyGen WebRTC...');
      
      // 暫時創建一個佔位的視頻元素來顯示 Avatar 待機畫面
      // 在實際應用中，這裡會連接到 HeyGen 的 realtime_endpoint
      
      if (this.videoElement) {
        // 設置一個預設背景或 Avatar 佔位圖
        this.videoElement.style.backgroundColor = '#f0f0f0';
        this.videoElement.style.backgroundImage = 'url("data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' viewBox=\'0 0 200 200\'><rect width=\'200\' height=\'200\' fill=\'%23e0e0e0\'/><text x=\'100\' y=\'100\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-family=\'Arial, sans-serif\' font-size=\'14\' fill=\'%23666\'>HeyGen Avatar</text></svg>")';
        this.videoElement.style.backgroundSize = 'contain';
        this.videoElement.style.backgroundRepeat = 'no-repeat';
        this.videoElement.style.backgroundPosition = 'center';
      }
      
      console.log('[HeyGenPlayer] HeyGen WebRTC 已初始化 (使用佔位元素)');
      this.isConnected = true;
      
    } catch (error) {
      console.error('[HeyGenPlayer] HeyGen WebRTC 初始化失敗:', error);
    }
  }

  private showNoLiveKitMessage() {
    const loadingElement = this.container.querySelector('#heygen-loading') as HTMLElement;
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
          <div style="font-size: 16px; font-weight: 500;">LiveKit SDK 載入失敗</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
            HeyGen 會話已建立，但無法顯示視頻<br>
            請檢查網路連接並重新整理頁面
          </div>
        </div>
      `;
    }
  }

  private async initializeLiveKit(options: HeyGenPlayerOptions) {
    try {
      const { Room, RoomEvent, VideoPresets } = window.LivekitClient;
      
      // 創建 LiveKit Room
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720,
        },
      });

      // 設置事件監聽
      this.setupEventListeners();

      // 連接到 LiveKit 服務器
      if (options.livekitUrl && options.livekitToken) {
        console.log(`[HeyGenPlayer] Connecting to LiveKit: ${options.livekitUrl}`);
        
        await this.room.connect(options.livekitUrl, options.livekitToken, {
          autoSubscribe: true,
        });
        
        this.isConnected = true;
        console.log('[HeyGenPlayer] Successfully connected to LiveKit');
      } else {
        console.warn('[HeyGenPlayer] Missing LiveKit connection info');
      }
    } catch (error) {
      console.error('[HeyGenPlayer] Failed to initialize LiveKit:', error);
    }
  }

  private setupEventListeners() {
    const { Track } = window.LivekitClient;
    const RoomEvent = window.LivekitClient.RoomEvent;

    // 監聽參與者加入
    this.room.on(RoomEvent.ParticipantConnected, (participant: any) => {
      console.log('[HeyGenPlayer] Participant connected:', participant.identity);
    });

    // 監聽音視頻軌道
    this.room.on(RoomEvent.TrackSubscribed, (track: any, _publication: any, participant: any) => {
      console.log(`[HeyGenPlayer] Track subscribed: ${track.kind} from ${participant.identity}`);
      
      if (track.kind === Track.Kind.Video) {
        this.attachVideoTrack(track);
      } else if (track.kind === Track.Kind.Audio) {
        this.attachAudioTrack(track);
      }
    });

    // 監聽軌道取消訂閱
    this.room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
      console.log(`[HeyGenPlayer] Track unsubscribed: ${track.kind}`);
      track.detach();
    });

    // 監聽斷線
    this.room.on(RoomEvent.Disconnected, () => {
      console.log('[HeyGenPlayer] Disconnected from LiveKit');
      this.isConnected = false;
    });
  }

  private attachVideoTrack(track: any) {
    // 查找或創建 video 元素
    this.videoElement = this.container.querySelector('#heygen-video') as HTMLVideoElement;
    
    if (this.videoElement) {
      track.attach(this.videoElement);
      this.videoElement.style.display = 'block';
      
      // 隱藏載入畫面
      const loadingElement = this.container.querySelector('#heygen-loading') as HTMLElement;
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      console.log('[HeyGenPlayer] Video track attached');
    }
  }

  private attachAudioTrack(track: any) {
    // 查找或創建 audio 元素
    this.audioElement = this.container.querySelector('#heygen-audio') as HTMLAudioElement;
    
    if (this.audioElement) {
      track.attach(this.audioElement);
      console.log('[HeyGenPlayer] Audio track attached');
    }
  }

  async disconnect() {
    if (this.room && this.isConnected) {
      await this.room.disconnect();
      this.isConnected = false;
      console.log('[HeyGenPlayer] Disconnected from LiveKit');
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }
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

export class HeyGenDirectSessionImpl implements HeyGenDirectSession {
  public sessionId: string;
  public isActive: boolean = false;
  private apiUrl: string;
  private apiKey: string;
  public onSessionUpdate?: (status: HeyGenSessionStatus) => void;
  // LiveKit 連接資訊
  public livekitUrl?: string;
  public livekitToken?: string;
  public livekitIceServers?: any[];
  // HeyGen realtime endpoint
  public realtimeEndpoint?: string;
  public player?: HeyGenPlayer;

  constructor(sessionId: string, apiUrl: string, apiKey?: string) {
    this.sessionId = sessionId;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey || '';
  }

  async speak(text: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateStatus('speaking', '正在發送語音合成請求...');
      
      const response = await fetch(`${this.apiUrl}/heygen-direct/session/${this.sessionId}/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'x-api-key': this.apiKey }),
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.updateStatus('error', '語音合成失敗', errorData.error);
        return { success: false, error: errorData.error || response.statusText };
      }

      await response.json();
      this.updateStatus('ready', '語音合成完成');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus('error', '語音合成請求失敗', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/heygen-direct/session/${this.sessionId}/stop`, {
        method: 'POST',
        headers: {
          ...(this.apiKey && { 'x-api-key': this.apiKey }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || response.statusText };
      }

      this.isActive = false;
      this.updateStatus('stopped', '會話已停止');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  private updateStatus(status: HeyGenSessionStatus['status'], message?: string, error?: string) {
    if (this.onSessionUpdate) {
      this.onSessionUpdate({
        sessionId: this.sessionId,
        status,
        message,
        error,
      });
    }
  }
}

export class AI3STTS {
  private config: AI3STTSConfig;
  private socket?: Socket;
  private activeSessions: Map<string, HeyGenDirectSessionImpl> = new Map();

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


  async createPlayer(container: HTMLElement, session: HeyGenDirectSession): Promise<HeyGenPlayer> {
    if (!(session instanceof HeyGenDirectSessionImpl)) {
      throw new Error('Invalid session type');
    }

    const player = new HeyGenPlayer({
      container,
      sessionId: session.sessionId,
      livekitUrl: session.livekitUrl,
      livekitToken: session.livekitToken,
      livekitIceServers: session.livekitIceServers,
      realtimeEndpoint: session.realtimeEndpoint,
    });

    session.player = player;
    return player;
  }

  async createHeyGenDirectSession(options?: {
    avatarId?: string;
    voiceId?: string;
    onSessionUpdate?: (status: HeyGenSessionStatus) => void;
  }): Promise<HeyGenDirectSession> {

    try {
      const response = await fetch(`${this.config.apiUrl}/heygen-direct/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'x-api-key': this.config.apiKey }),
        },
        body: JSON.stringify({
          avatarId: options?.avatarId,
          voiceId: options?.voiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const session = new HeyGenDirectSessionImpl(
        data.sessionId,
        this.config.apiUrl,
        this.config.apiKey
      );

      // 儲存 LiveKit 連接資訊
      if (data.livekitUrl) {
        session.livekitUrl = data.livekitUrl;
        session.livekitToken = data.livekitToken;
        session.livekitIceServers = data.livekitIceServers;
        console.log('[AI3STTS] LiveKit connection info received');
      }

      // 儲存 HeyGen realtime endpoint
      if (data.realtimeEndpoint) {
        session.realtimeEndpoint = data.realtimeEndpoint;
        console.log('[AI3STTS] HeyGen realtime endpoint received:', data.realtimeEndpoint);
      }

      if (options?.onSessionUpdate) {
        session.onSessionUpdate = options.onSessionUpdate;
      }

      session.isActive = true;
      this.activeSessions.set(data.sessionId, session);

      session.onSessionUpdate?.({
        sessionId: data.sessionId,
        status: 'ready',
        message: 'HeyGen 直接會話已建立',
      });

      return session;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`建立 HeyGen 直接會話失敗: ${errorMsg}`);
    }
  }

  async getHeyGenDirectSession(sessionId: string): Promise<HeyGenDirectSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  async getAllActiveSessions(): Promise<HeyGenDirectSession[]> {
    return Array.from(this.activeSessions.values());
  }

  async stopHeyGenDirectSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: '會話不存在' };
    }

    const result = await session.stop();
    if (result.success) {
      this.activeSessions.delete(sessionId);
    }

    return result;
  }

  async stopAllHeyGenDirectSessions(): Promise<void> {
    const promises = Array.from(this.activeSessions.keys()).map(sessionId =>
      this.stopHeyGenDirectSession(sessionId)
    );
    await Promise.all(promises);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    
    // 停止所有活動的 HeyGen 直接會話
    this.stopAllHeyGenDirectSessions().catch(console.error);
  }

  // 官方 SDK 整合方法
  async createOfficialAvatarSession(options: {
    avatarId: string;
    voiceId?: string;
  }): Promise<OfficialAvatarSession> {
    try {
      // 從後端取得 token
      const response = await fetch(`${this.config.apiUrl}/heygen-direct/v1/streaming.create_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarId: options.avatarId }),
      });

      if (!response.ok) {
        throw new Error(`Token 取得失敗: ${response.status}`);
      }

      const token = await response.text();
      
      return new OfficialAvatarSession({
        token,
        avatarId: options.avatarId,
        voiceId: options.voiceId,
      });
    } catch (error) {
      throw new Error(`建立官方 Avatar 會話失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 官方 SDK Avatar 會話管理類別
export class OfficialAvatarSession {
  private avatarRef: StreamingAvatar | null = null;
  private token: string;
  private avatarId: string;
  private voiceId?: string;
  private stream: MediaStream | null = null;
  private sessionState: 'inactive' | 'connecting' | 'connected' = 'inactive';
  private mediaContainer?: HTMLElement;

  constructor(options: {
    token: string;
    avatarId: string;
    voiceId?: string;
  }) {
    this.token = options.token;
    this.avatarId = options.avatarId;
    this.voiceId = options.voiceId;
  }

  // 初始化並啟動 Avatar
  async initialize(mediaContainer?: HTMLElement): Promise<void> {
    if (this.sessionState !== 'inactive') {
      throw new Error('會話已經初始化');
    }

    this.mediaContainer = mediaContainer;
    this.sessionState = 'connecting';

    try {
      // 初始化 StreamingAvatar
      this.avatarRef = new StreamingAvatar({
        token: this.token,
      });

      // 設定事件監聽
      this.avatarRef.on(StreamingEvents.STREAM_READY, ({ detail }) => {
        console.log('[OfficialAvatarSession] Stream ready');
        this.stream = detail;
        this.sessionState = 'connected';
        
        // 如果提供了容器，自動附加視頻
        if (this.mediaContainer) {
          this.attachVideoToContainer();
        }
      });

      this.avatarRef.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log('[OfficialAvatarSession] Stream disconnected');
        this.sessionState = 'inactive';
      });

      // 建立 Avatar 配置
      const config: StartAvatarRequest = {
        quality: AvatarQuality.Low,
        avatarName: this.avatarId,
        voice: this.voiceId ? {
          rate: 1.0,
          emotion: VoiceEmotion.EXCITED,
          voiceId: this.voiceId,
        } : undefined,
        language: "en",
        voiceChatTransport: VoiceChatTransport.WEBSOCKET,
        sttSettings: {
          provider: STTProvider.DEEPGRAM,
        },
      };

      // 啟動 Avatar
      await this.avatarRef.createStartAvatar(config);
      
    } catch (error) {
      this.sessionState = 'inactive';
      throw error;
    }
  }

  // 語音合成
  async speak(text: string): Promise<void> {
    if (!this.avatarRef) {
      throw new Error('Avatar 尚未初始化');
    }

    if (this.sessionState !== 'connected') {
      throw new Error(`Avatar 狀態不正確: ${this.sessionState}`);
    }

    try {
      await this.avatarRef.speak({
        text: text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC,
      });
    } catch (error) {
      throw new Error(`語音合成失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 停止會話
  async stop(): Promise<void> {
    if (this.avatarRef) {
      await this.avatarRef.stopAvatar();
      this.avatarRef = null;
    }
    this.sessionState = 'inactive';
    this.stream = null;
  }

  // 取得當前狀態
  getState(): 'inactive' | 'connecting' | 'connected' {
    return this.sessionState;
  }

  // 取得媒體串流
  getStream(): MediaStream | null {
    return this.stream;
  }

  // 附加視頻到容器
  private attachVideoToContainer(): void {
    if (!this.stream || !this.mediaContainer) {
      console.log('[OfficialAvatarSession] attachVideoToContainer: missing stream or container', {
        hasStream: !!this.stream,
        hasContainer: !!this.mediaContainer
      });
      return;
    }

    console.log('[OfficialAvatarSession] 附加視頻到容器');
    let videoElement = this.mediaContainer.querySelector('video') as HTMLVideoElement;
    
    if (!videoElement) {
      console.log('[OfficialAvatarSession] 創建新的視頻元素');
      videoElement = document.createElement('video');
      this.mediaContainer.appendChild(videoElement);
    } else {
      console.log('[OfficialAvatarSession] 使用現有的視頻元素');
    }
    
    // 設置視頻屬性
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true; // 加上 muted 以允許自動播放
    videoElement.controls = true; // 添加控制項以便調試
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.backgroundColor = 'black'; // 添加背景色以便識別
    videoElement.style.position = 'absolute'; // 絕對定位
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.zIndex = '10'; // 提高層級
    videoElement.style.display = 'block'; // 確保顯示（覆蓋現有的 display: none）

    console.log('[OfficialAvatarSession] 設置視頻源');
    videoElement.srcObject = this.stream;
    
    // 嘗試手動播放
    videoElement.play().then(() => {
      console.log('[OfficialAvatarSession] ✅ 視頻自動播放成功');
    }).catch(error => {
      console.warn('[OfficialAvatarSession] ⚠️ 視頻自動播放失敗，需要用戶互動:', error);
    });
  }
}

// Export for UMD build
if (typeof window !== 'undefined') {
  (window as any).AI3STTS = AI3STTS;
  (window as any).HeyGenDirectSessionImpl = HeyGenDirectSessionImpl;
  (window as any).OfficialAvatarSession = OfficialAvatarSession;
  console.log('🚀 AI3-STTS SDK v4.0 載入完成 - HeyGen 官方 SDK 整合版本');
}

export default AI3STTS;