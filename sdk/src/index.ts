import { io, Socket } from 'socket.io-client';

// LiveAvatar SDK types (loaded via CDN as UMD global)
declare global {
  interface Window {
    LiveAvatarSDK: {
      LiveAvatarSession: new (
        sessionToken: string,
        config?: { voiceChat?: boolean | object; apiUrl?: string },
      ) => LiveAvatarSessionInstance;
    };
  }
}

interface LiveAvatarSessionInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: string, callback: (data?: any) => void): void;
  off(event: string, callback: (data?: any) => void): void;
  attach(element: HTMLMediaElement): void;
  message(text: string): void;
  repeat(text: string): void;
  interrupt(): void;
  keepAlive?(): void;
  maxSessionDuration?: number;
}

// --- Config & Interfaces ---

export interface AI3STTSConfig {
  apiUrl: string;
  apiKey?: string;
  enableSTT?: boolean;
}

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
}

export interface STTStartOptions {
  language?: string;
}

export interface VoiceSettings {
  speed?: number;
  stability?: number;
  style?: number;
}

export type StopReason =
  | 'IDLE_TIMEOUT'
  | 'NO_CREDITS'
  | 'MAX_DURATION_REACHED'
  | 'ZOMBIE_SESSION_REAP'
  | 'SERVER_ERROR'
  | 'AVATAR_DELETED'
  | 'AGENT_HANG_UP'
  | 'USER_DISCONNECTED'
  | 'USER_CLOSED'
  | 'CLIENT_INITIATED'
  | 'SESSION_START_FAILED'
  | 'UNKNOWN_REASON'
  | string;

export interface LiveAvatarSessionOptions {
  avatarId: string;
  voiceId?: string;
  quality?: 'very_high' | 'high' | 'medium' | 'low';
  isSandbox?: boolean;
  language?: string;
  maxSessionDuration?: number;
  voiceSettings?: VoiceSettings;
  mediaElement?: HTMLMediaElement;
  onEvent?: (event: string, data?: any) => void;
  onStopped?: (reason: StopReason) => void;
  keepAliveIntervalMs?: number;
}

export interface LiveAvatarSessionHandle {
  sessionId: string;
  session: LiveAvatarSessionInstance;
  speak(text: string): void;
  interrupt(): void;
  stop(): Promise<void>;
}

// --- STT Session ---

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
    this.socket.on('stt-started', () => {
      this.isActive = true;
      console.log('[STTSession] started');
    });

    this.socket.on('stt-result', (data: STTResult) => {
      this.resultCallback?.(data);
    });

    this.socket.on('stt-recognizing', (data: STTResult) => {
      this.recognizingCallback?.(data);
    });

    this.socket.on('stt-error', (data: { error: string }) => {
      console.error('[STTSession] error:', data.error);
      this.errorCallback?.(data.error);
    });

    this.socket.on('stt-stopped', () => {
      this.isActive = false;
      console.log('[STTSession] stopped');
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
      console.warn('[STTSession] session is not active');
      return;
    }
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

// --- Main SDK Class ---

export class AI3STTS {
  private config: AI3STTSConfig;
  private socket?: Socket;
  private sttEnabled: boolean;

  constructor(config: AI3STTSConfig) {
    this.config = config;
    this.sttEnabled = config.enableSTT !== false;

    if (!this.sttEnabled) {
      console.log('[AI3STTS] STT disabled');
    }
  }

  // --- STT Methods ---

  private getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(`${this.config.apiUrl}/stt`, {
        transports: ['websocket'],
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('[AI3STTS] WebSocket connected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('[AI3STTS] WebSocket connection error:', error);
      });

      this.socket.on('disconnect', () => {
        console.log('[AI3STTS] WebSocket disconnected');
      });
    }
    return this.socket;
  }

  async startSTT(options: STTStartOptions = {}): Promise<STTSession> {
    if (!this.sttEnabled) {
      throw new Error('STT is disabled. Set enableSTT: true to enable.');
    }

    return new Promise((resolve, reject) => {
      // Clean up old socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket.removeAllListeners();
        this.socket = undefined;
      }

      setTimeout(() => {
        const socket = this.getSocket();

        const startSession = () => {
          const session = new STTSession(socket);

          socket.emit('start-stt', {
            language: options.language || 'zh-TW',
            apiKey: this.config.apiKey,
          });

          socket.once('stt-started', () => resolve(session));
          socket.once('stt-error', (data: { error: string }) =>
            reject(new Error(data.error)),
          );
        };

        socket.once('connect', startSession);
        socket.once('connect_error', (error) => reject(error));
        socket.connect();
      }, 100);
    });
  }

  isSTTEnabled(): boolean {
    return this.sttEnabled;
  }

  setSTTEnabled(enabled: boolean): void {
    this.sttEnabled = enabled;
    if (!enabled && this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    console.log(`[AI3STTS] STT ${enabled ? 'enabled' : 'disabled'}`);
  }

  // --- LiveAvatar Methods ---

  async createLiveAvatarSession(
    options: LiveAvatarSessionOptions,
  ): Promise<LiveAvatarSessionHandle> {
    // 1. Get session token from server
    const response = await fetch(`${this.config.apiUrl}/liveavatar/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'x-api-key': this.config.apiKey }),
      },
      body: JSON.stringify({
        avatarId: options.avatarId,
        voiceId: options.voiceId,
        quality: options.quality,
        isSandbox: options.isSandbox,
        language: options.language,
        maxSessionDuration: options.maxSessionDuration,
        voiceSettings: options.voiceSettings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token 取得失敗: ${(errorData as any).error || response.statusText}`,
      );
    }

    const { data } = await response.json();
    const { sessionId, sessionToken } = data;

    console.log(`[AI3STTS] Session token received: ${sessionId}`);

    // 2. Create LiveAvatarSession
    if (!window.LiveAvatarSDK?.LiveAvatarSession) {
      throw new Error(
        'LiveAvatar SDK not loaded. Add <script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk@0.0.17/dist/index.umd.js"></script> to your page.',
      );
    }

    const session = new window.LiveAvatarSDK.LiveAvatarSession(sessionToken, {
      voiceChat: false,
    });

    // 3. Declare keep-alive timer early so session.stopped handler can access it
    const keepAliveMs = options.keepAliveIntervalMs ?? 20000;
    let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

    // 4. Bind standard events
    const standardEvents = [
      'avatar_start_talking',
      'avatar_stop_talking',
      'user_start_talking',
      'user_stop_talking',
      'session_disconnected',
    ];

    for (const event of standardEvents) {
      session.on(event, (eventData?: any) => {
        console.log(`[AI3STTS] Event: ${event}`, eventData || '');
        options.onEvent?.(event, eventData);
      });
    }

    // session.stopped: extract stop_reason, clear keep-alive, fire callbacks
    const RECONNECTABLE_REASONS = new Set<StopReason>([
      'IDLE_TIMEOUT',
      'SERVER_ERROR',
      'ZOMBIE_SESSION_REAP',
      'UNKNOWN_REASON',
    ]);
    session.on('session.stopped', (eventData?: any) => {
      const reason: StopReason = eventData?.stop_reason ?? 'UNKNOWN_REASON';
      console.log(`[AI3STTS] Session stopped. reason=${reason}`, eventData || '');
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      options.onEvent?.('session.stopped', { ...eventData, stop_reason: reason });
      options.onStopped?.(reason);
      if (!RECONNECTABLE_REASONS.has(reason)) {
        console.warn(`[AI3STTS] Non-reconnectable stop reason: ${reason}. Not auto-reconnecting.`);
      }
    });

    // 5. Start session — wait for stream_ready event before proceeding
    const startPromise = new Promise<void>((resolve, reject) => {
      const onStreamReady = () => {
        session.off('session.stream_ready', onStreamReady);
        resolve();
      };
      session.on('session.stream_ready', onStreamReady);

      const maxRetries = 3;
      const tryStart = async (attempt: number): Promise<void> => {
        try {
          await session.start();
        } catch (startError) {
          session.off('session.stream_ready', onStreamReady);
          if (attempt < maxRetries) {
            console.warn(
              `[AI3STTS] Session start attempt ${attempt} failed, retrying in 3s...`,
              startError,
            );
            await new Promise((r) => setTimeout(r, 3000));
            session.on('session.stream_ready', onStreamReady);
            return tryStart(attempt + 1);
          } else {
            reject(startError);
          }
        }
      };
      tryStart(1);
    });

    await startPromise;
    console.log(`[AI3STTS] LiveAvatar session started: ${sessionId}`);

    // 6. Verify maxSessionDuration matches requested value
    if (options.maxSessionDuration && session.maxSessionDuration !== undefined) {
      if (session.maxSessionDuration !== options.maxSessionDuration) {
        console.warn(
          `[AI3STTS] maxSessionDuration mismatch! requested=${options.maxSessionDuration}s, server=${session.maxSessionDuration}s`,
        );
      }
    }
    console.log(`[AI3STTS] maxSessionDuration=${session.maxSessionDuration ?? 'unknown'}s`);

    // 7. Attach media element after stream is ready
    if (options.mediaElement) {
      session.attach(options.mediaElement);
      console.log('[AI3STTS] Media element attached');
    }

    // 8. Keep-alive to prevent IDLE_TIMEOUT
    let onVisible: (() => void) | null = null;
    if (typeof session.keepAlive === 'function') {
      keepAliveTimer = setInterval(() => {
        try {
          session.keepAlive!();
        } catch (e) {
          console.warn('[AI3STTS] keepAlive failed', e);
        }
      }, keepAliveMs);

      onVisible = () => {
        if (document.visibilityState === 'visible') {
          try { session.keepAlive!(); } catch (_) { /* ignore */ }
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      console.log(`[AI3STTS] keep-alive started every ${keepAliveMs}ms`);
    } else {
      console.warn('[AI3STTS] session.keepAlive not available in this SDK version — IDLE_TIMEOUT risk');
    }

    // 9. Return handle
    return {
      sessionId,
      session,
      speak(text: string) {
        session.repeat(text);
      },
      interrupt() {
        session.interrupt();
      },
      async stop() {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        if (onVisible) {
          document.removeEventListener('visibilitychange', onVisible);
        }
        try {
          await session.stop();
        } catch (e) {
          console.warn(`[AI3STTS] Session stop warning:`, e);
        }
        console.log(`[AI3STTS] LiveAvatar session stopped: ${sessionId}`);
      },
    };
  }

  async getConfig(): Promise<{
    avatarId?: string;
    voiceId?: string;
  }> {
    const response = await fetch(`${this.config.apiUrl}/liveavatar/config`, {
      headers: {
        ...(this.config.apiKey && { 'x-api-key': this.config.apiKey }),
      },
    });
    const data = await response.json();
    return data.config || {};
  }

  // --- Cleanup ---

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}

// UMD exports
if (typeof window !== 'undefined') {
  (window as any).AI3STTS = AI3STTS;
  console.log('[AI3STTS] SDK v2.0 loaded — LiveAvatar integration');
}

export default AI3STTS;
