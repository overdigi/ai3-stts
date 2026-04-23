(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('socket.io-client')) :
    typeof define === 'function' && define.amd ? define(['exports', 'socket.io-client'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AI3STTS = {}, global.io));
})(this, (function (exports, socket_ioClient) { 'use strict';

    // --- STT Session ---
    class STTSession {
        constructor(socket) {
            this.isActive = false;
            this.socket = socket;
            this.setupEventHandlers();
        }
        setupEventHandlers() {
            this.socket.on('stt-started', () => {
                this.isActive = true;
                console.log('[STTSession] started');
            });
            this.socket.on('stt-result', (data) => {
                var _a;
                (_a = this.resultCallback) === null || _a === void 0 ? void 0 : _a.call(this, data);
            });
            this.socket.on('stt-recognizing', (data) => {
                var _a;
                (_a = this.recognizingCallback) === null || _a === void 0 ? void 0 : _a.call(this, data);
            });
            this.socket.on('stt-error', (data) => {
                var _a;
                console.error('[STTSession] error:', data.error);
                (_a = this.errorCallback) === null || _a === void 0 ? void 0 : _a.call(this, data.error);
            });
            this.socket.on('stt-stopped', () => {
                this.isActive = false;
                console.log('[STTSession] stopped');
            });
        }
        onResult(callback) {
            this.resultCallback = callback;
        }
        onRecognizing(callback) {
            this.recognizingCallback = callback;
        }
        onError(callback) {
            this.errorCallback = callback;
        }
        sendAudio(audioData) {
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
        isRunning() {
            return this.isActive;
        }
    }
    // --- Main SDK Class ---
    class AI3STTS {
        constructor(config) {
            this.config = config;
            this.sttEnabled = config.enableSTT !== false;
            if (!this.sttEnabled) {
                console.log('[AI3STTS] STT disabled');
            }
        }
        // --- STT Methods ---
        getSocket() {
            if (!this.socket) {
                this.socket = socket_ioClient.io(`${this.config.apiUrl}/stt`, {
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
        async startSTT(options = {}) {
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
                        socket.once('stt-error', (data) => reject(new Error(data.error)));
                    };
                    socket.once('connect', startSession);
                    socket.once('connect_error', (error) => reject(error));
                    socket.connect();
                }, 100);
            });
        }
        isSTTEnabled() {
            return this.sttEnabled;
        }
        setSTTEnabled(enabled) {
            this.sttEnabled = enabled;
            if (!enabled && this.socket) {
                this.socket.disconnect();
                this.socket = undefined;
            }
            console.log(`[AI3STTS] STT ${enabled ? 'enabled' : 'disabled'}`);
        }
        // --- LiveAvatar Methods ---
        async createLiveAvatarSession(options) {
            var _a;
            // 1. Get session token from server
            const response = await fetch(`${this.config.apiUrl}/liveavatar/token`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, (this.config.apiKey && { 'x-api-key': this.config.apiKey })),
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
                throw new Error(`Token 取得失敗: ${errorData.error || response.statusText}`);
            }
            const { data } = await response.json();
            const { sessionId, sessionToken } = data;
            console.log(`[AI3STTS] Session token received: ${sessionId}`);
            // 2. Create LiveAvatarSession
            if (!((_a = window.LiveAvatarSDK) === null || _a === void 0 ? void 0 : _a.LiveAvatarSession)) {
                throw new Error('LiveAvatar SDK not loaded. Add <script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk/dist/index.umd.js"></script> to your page.');
            }
            const session = new window.LiveAvatarSDK.LiveAvatarSession(sessionToken, {
                voiceChat: false,
            });
            // 3. Bind events
            const events = [
                'avatar_start_talking',
                'avatar_stop_talking',
                'user_start_talking',
                'user_stop_talking',
                'session_stopped',
            ];
            for (const event of events) {
                session.on(event, (eventData) => {
                    var _a;
                    console.log(`[AI3STTS] Event: ${event}`, eventData || '');
                    (_a = options.onEvent) === null || _a === void 0 ? void 0 : _a.call(options, event, eventData);
                });
            }
            // 4. Start session with retry (API may need time to release previous session)
            const startPromise = new Promise((resolve, reject) => {
                const onStreamReady = () => {
                    session.off('session.stream_ready', onStreamReady);
                    resolve();
                };
                session.on('session.stream_ready', onStreamReady);
                const maxRetries = 3;
                const tryStart = async (attempt) => {
                    try {
                        await session.start();
                    }
                    catch (startError) {
                        session.off('session.stream_ready', onStreamReady);
                        if (attempt < maxRetries) {
                            console.warn(`[AI3STTS] Session start attempt ${attempt} failed, retrying in 3s...`, startError);
                            await new Promise((r) => setTimeout(r, 3000));
                            session.on('session.stream_ready', onStreamReady);
                            return tryStart(attempt + 1);
                        }
                        else {
                            reject(startError);
                        }
                    }
                };
                tryStart(1);
            });
            await startPromise;
            console.log(`[AI3STTS] LiveAvatar session started: ${sessionId}`);
            // 5. Attach media element after stream is ready
            if (options.mediaElement) {
                session.attach(options.mediaElement);
                console.log('[AI3STTS] Media element attached');
            }
            // 6. Return handle
            return {
                sessionId,
                session,
                speak(text) {
                    session.repeat(text);
                },
                interrupt() {
                    session.interrupt();
                },
                async stop() {
                    try {
                        await session.stop();
                    }
                    catch (e) {
                        console.warn(`[AI3STTS] Session stop warning:`, e);
                    }
                    console.log(`[AI3STTS] LiveAvatar session stopped: ${sessionId}`);
                },
            };
        }
        async getConfig() {
            const response = await fetch(`${this.config.apiUrl}/liveavatar/config`, {
                headers: Object.assign({}, (this.config.apiKey && { 'x-api-key': this.config.apiKey })),
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
        window.AI3STTS = AI3STTS;
        console.log('[AI3STTS] SDK v2.0 loaded — LiveAvatar integration');
    }

    exports.AI3STTS = AI3STTS;
    exports.STTSession = STTSession;
    exports.default = AI3STTS;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=ai3-stts.js.map
