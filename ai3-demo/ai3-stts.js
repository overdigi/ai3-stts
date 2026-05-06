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
            var _a, _b, _c;
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
                throw new Error('LiveAvatar SDK not loaded. Add <script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk@0.0.17/dist/index.umd.js"></script> to your page.');
            }
            const session = new window.LiveAvatarSDK.LiveAvatarSession(sessionToken, {
                voiceChat: false,
            });
            // 3. Bind events
            const standardEvents = [
                'avatar_start_talking',
                'avatar_stop_talking',
                'user_start_talking',
                'user_stop_talking',
                'session_disconnected',
            ];
            for (const event of standardEvents) {
                session.on(event, (eventData) => {
                    var _a;
                    console.log(`[AI3STTS] Event: ${event}`, eventData || '');
                    (_a = options.onEvent) === null || _a === void 0 ? void 0 : _a.call(options, event, eventData);
                });
            }
            // session.stopped: extract stop_reason and decide whether to reconnect
            const RECONNECTABLE_REASONS = new Set([
                'IDLE_TIMEOUT',
                'SERVER_ERROR',
                'ZOMBIE_SESSION_REAP',
                'UNKNOWN_REASON',
            ]);
            session.on('session.stopped', (eventData) => {
                var _a, _b, _c;
                const reason = (_a = eventData === null || eventData === void 0 ? void 0 : eventData.stop_reason) !== null && _a !== void 0 ? _a : 'UNKNOWN_REASON';
                console.log(`[AI3STTS] Session stopped. reason=${reason}`, eventData || '');
                (_b = options.onEvent) === null || _b === void 0 ? void 0 : _b.call(options, 'session.stopped', Object.assign(Object.assign({}, eventData), { stop_reason: reason }));
                (_c = options.onStopped) === null || _c === void 0 ? void 0 : _c.call(options, reason);
                if (!RECONNECTABLE_REASONS.has(reason)) {
                    console.warn(`[AI3STTS] Non-reconnectable stop reason: ${reason}. Not auto-reconnecting.`);
                }
            });
            // 4. Start session with retry (API may need time to release previous session)
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await session.start();
                    break;
                }
                catch (startError) {
                    if (attempt < maxRetries) {
                        console.warn(`[AI3STTS] Session start attempt ${attempt} failed, retrying in 3s...`, startError);
                        await new Promise((r) => setTimeout(r, 3000));
                    }
                    else {
                        throw startError;
                    }
                }
            }
            console.log(`[AI3STTS] LiveAvatar session started: ${sessionId}`);
            // 5. Verify maxSessionDuration matches requested value
            if (options.maxSessionDuration && session.maxSessionDuration !== undefined) {
                if (session.maxSessionDuration !== options.maxSessionDuration) {
                    console.warn(`[AI3STTS] maxSessionDuration mismatch! requested=${options.maxSessionDuration}s, server=${session.maxSessionDuration}s`);
                }
            }
            console.log(`[AI3STTS] maxSessionDuration=${(_b = session.maxSessionDuration) !== null && _b !== void 0 ? _b : 'unknown'}s`);
            // 6. Attach media element after session is ready
            if (options.mediaElement) {
                session.attach(options.mediaElement);
                console.log('[AI3STTS] Media element attached');
            }
            // 7. Keep-alive to prevent IDLE_TIMEOUT
            const keepAliveMs = (_c = options.keepAliveIntervalMs) !== null && _c !== void 0 ? _c : 20000;
            let keepAliveTimer = null;
            if (typeof session.keepAlive === 'function') {
                keepAliveTimer = setInterval(() => {
                    try {
                        session.keepAlive();
                    }
                    catch (e) {
                        console.warn('[AI3STTS] keepAlive failed', e);
                    }
                }, keepAliveMs);
                // Re-trigger on tab visibility restored (browser throttles setInterval in background)
                const onVisible = () => {
                    if (document.visibilityState === 'visible') {
                        try {
                            session.keep_alive();
                        }
                        catch (_) { /* ignore */ }
                    }
                };
                document.addEventListener('visibilitychange', onVisible);
                console.log(`[AI3STTS] keep-alive started every ${keepAliveMs}ms`);
                // 8. Return handle
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
                        if (keepAliveTimer) {
                            clearInterval(keepAliveTimer);
                            keepAliveTimer = null;
                        }
                        document.removeEventListener('visibilitychange', onVisible);
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
            // 8. Return handle (no keepAlive support in this SDK version)
            console.warn('[AI3STTS] session.keepAlive not available in this SDK version — IDLE_TIMEOUT risk');
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
