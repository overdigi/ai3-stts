
var Avatar = {
    // 原有屬性
    client: null,
    avatarId: null,
    voiceId: null,
    avatarName: null,

    // STT 相關屬性（簡化版本）
    sttSession: null,
    mediaRecorder: null,
    mediaStream: null,
    isRecording: false,

    // UI 元素引用
    micButton: null,
    transcriptText: null,
    statusIndicator: null,
    permissionModal: null,
    textInput: null,
    sendButton: null,
    inputCounter: null,
    modeSelector: null,
    modeStatus: null,

    // HeyGen 直接模式相關
    directSession: null,
    directSocket: null,
    player: null, // LiveKit Player

    // 功能開關
    enableSTT: true, // 重新啟用 STT 功能
    isInitialized: false,

    doLoad: function () {
        console.log('Avatar.doLoad() 開始執行');
        
        // 檢查必要的依賴
        if (!this.checkDependencies()) {
            return;
        }
        
        this.initUI();
        this.setupEventListeners();
        this.checkMicrophonePermission();
        
        // 延遲初始化 Avatar 避免依賴問題
        setTimeout(() => {
            this.initAvatar();
        }, 500);
        
        console.log('Avatar.doLoad() 完成');
    },

    checkDependencies: function() {
        console.log('=== 檢查系統依賴 ===');
        
        // 檢查 AI3STTS SDK（僅用於語音播放）
        if (typeof AI3STTS === 'undefined') {
            console.error('❌ AI3STTS SDK 未載入');
            this.updateStatus('error', 'SDK 未載入');
            return false;
        }
        console.log('✅ AI3STTS SDK 已載入');
        
        // 檢查 Util 配置
        if (typeof Util === 'undefined' || typeof Util.getConfig !== 'function') {
            console.error('❌ Util 物件或 getConfig 函數未找到');
            this.updateStatus('error', '配置系統未載入');
            return false;
        }
        console.log('✅ Util 配置系統已載入');
        
        // 檢查 WebChat
        if (typeof WebChat === 'undefined' || typeof WebChat.ajax !== 'function') {
            console.error('❌ WebChat 物件或 ajax 函數未找到');
            this.updateStatus('error', 'WebChat 系統未載入');
            return false;
        }
        console.log('✅ WebChat 系統已載入');
        
        return true;
    },

    initAvatar: function () {
        console.log('=== 開始初始化 Avatar ===');
        
        try {
            // 取得配置
            const apiUrl = Util.getConfig("avaterApiUrl");
            const apiKey = Util.getConfig("avaterApiKey");
            
            console.log('API URL:', apiUrl);
            console.log('API Key:', apiKey ? '已設置' : '未設置');
            
            if (!apiUrl) {
                throw new Error('Avatar API URL 未配置');
            }
            
            // 固定使用直接模式
            this.currentMode = 'direct';
            
            // 初始化 AI3STTS 客戶端（直接模式專用）
            console.log('正在初始化 AI3STTS 客戶端（直接模式）...');
            const clientConfig = {
                apiUrl: apiUrl,
                apiKey: apiKey
            };

            Avatar.client = new AI3STTS(clientConfig);
            console.log('✅ AI3STTS 客戶端初始化成功 (模式:', this.currentMode, ')');
            
            // 載入 Avatar 配置
            this.loadAvatarConfig();
            
        } catch (error) {
            console.error('❌ Avatar 初始化失敗:', error);
            this.updateStatus('error', '初始化失敗: ' + error.message);
        }
    },

    loadAvatarConfig: function() {
        console.log('正在載入 Avatar 配置...');
        
        WebChat.ajax({
            url: Util.getConfig("avaterApiUrl") + "/heygen/config",
            method: "GET",
            success: function (ret) {
                console.log('Avatar 配置載入成功:', ret);
                
                if (ret && ret.avatars && ret.avatars.length > 0) {
                    var avatar = ret.avatars[0];
                    Avatar.avatarId = avatar.id;
                    Avatar.voiceId = avatar.defaultVoiceId;
                    Avatar.avatarName = avatar.name;
                    
                    console.log('Avatar 設置:', {
                        id: Avatar.avatarId,
                        voice: Avatar.voiceId,
                        name: Avatar.avatarName
                    });
                    
                    // 直接模式準備就緒
                    Avatar.updateStatus('ready', '準備就緒');
                    Avatar.isInitialized = true;
                    
                    // 更新模式狀態顯示
                    Avatar.updateModeStatus();
                    
                    // 自動開始對話（可透過設定控制）
                    if (Util.getConfig("autoStartConversation") === true) {
                        console.log('設定為自動開始對話，延遲 2 秒後啟動...');
                        setTimeout(async () => {
                            await Avatar.startConversation();
                        }, 2000);
                    }
                } else {
                    throw new Error('無有效的 Avatar 配置');
                }
            },
            error: function (error) {
                console.error('❌ 載入 Avatar 配置失敗:', error);
                Avatar.updateStatus('error', '配置載入失敗');
            }
        });
    },

    initUI: function () {
        // 初始化 UI 元素
        this.micButton = document.getElementById('mic-button');
        this.transcriptText = document.getElementById('transcript-text');
        this.statusIndicator = document.getElementById('status-indicator');
        this.permissionModal = document.getElementById('permission-modal');
        this.textInput = document.getElementById('text-input');
        this.sendButton = document.getElementById('send-button');
        this.inputCounter = document.getElementById('input-counter');
        this.modeSelector = document.getElementById('mode-selector');
        this.modeStatus = document.getElementById('mode-status');

        // 檢查元素是否正確找到並記錄
        console.log('=== UI Elements 初始化檢查 ===');
        console.log('micButton:', this.micButton ? '✓' : '✗', this.micButton);
        console.log('transcriptText:', this.transcriptText ? '✓' : '✗', this.transcriptText);
        console.log('statusIndicator:', this.statusIndicator ? '✓' : '✗', this.statusIndicator);
        console.log('textInput:', this.textInput ? '✓' : '✗', this.textInput);
        console.log('sendButton:', this.sendButton ? '✓' : '✗', this.sendButton);
        console.log('inputCounter:', this.inputCounter ? '✓' : '✗', this.inputCounter);
        console.log('modeSelector:', this.modeSelector ? '✓' : '✗', this.modeSelector);
        console.log('modeStatus:', this.modeStatus ? '✓' : '✗', this.modeStatus);
        
        // 設置初始狀態
        if (this.transcriptText) {
            if (this.transcriptText) {
                this.transcriptText.textContent = '點擊麥克風開始語音輸入，或使用文字輸入...';
            }
        }
    },


    setupEventListeners: function () {
        // 麥克風按鈕事件
        if (this.micButton) {
            console.log('設置麥克風按鈕事件監聽器');
            this.micButton.addEventListener('click', async () => {
                console.log('=== 麥克風按鈕被點擊 ===');
                console.log('目前 isRecording 狀態:', Avatar.isRecording);
                console.log('系統是否已初始化:', Avatar.isInitialized);
                console.log('STT 功能是否啟用:', Avatar.enableSTT);
                
                // 檢查 STT 功能是否啟用
                if (!Avatar.enableSTT) {
                    Avatar.showSTTDisabledMessage();
                    return;
                }
                
                // 檢查系統是否已初始化
                if (!Avatar.isInitialized) {
                    console.warn('⚠️ 系統尚未完全初始化，請稍後再試');
                    Avatar.updateStatus('error', '系統初始化中，請稍後再試');
                    return;
                }
                
                if (Avatar.isRecording) {
                    console.log('執行 stopRecording...');
                    await Avatar.stopRecording();
                } else {
                    console.log('執行 startRecording...');
                    await Avatar.startRecording();
                }
            });
        }

        // 直接模式不需要額外的訊息監聽器

        // 文字輸入框事件
        if (this.textInput) {
            this.textInput.addEventListener('input', () => {
                Avatar.updateInputCounter(Avatar.textInput.value.length);
            });

            // Enter 鍵發送（Shift+Enter 換行）
            this.textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    Avatar.sendText();
                }
            });
        }

        // 發送按鈕事件
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                Avatar.sendText();
            });
        }
    },

    async checkMicrophonePermission() {
        if (!this.enableSTT) return;
        
        try {
            const permission = await navigator.permissions.query({ name: 'microphone' });
            
            if (permission.state === 'prompt') {
                this.showPermissionModal();
            } else if (permission.state === 'denied') {
                this.updateStatus('error', '麥克風權限被拒絕');
            }
        } catch (error) {
            console.log('無法檢查麥克風權限，將在使用時詢問');
        }
    },

    showPermissionModal: function () {
        if (this.permissionModal) {
            this.permissionModal.classList.remove('hidden');
        }
    },

    hidePermissionModal: function () {
        if (this.permissionModal) {
            this.permissionModal.classList.add('hidden');
        }
    },

    async startRecording() {
        console.log('[Avatar.startRecording] === startRecording 函數開始執行 ===');
        console.log('[Avatar.startRecording] 目前 isRecording 狀態:', this.isRecording);
        
        // 使用專門的函數調用日誌
        if (typeof TestUtils !== 'undefined' && TestUtils.logFunctionCall) {
            TestUtils.logFunctionCall('Avatar.startRecording', '開始 STT 錄音');
        }
        
        // 防止重複錄音
        if (this.isRecording) {
            console.log('已在錄音中，忽略此次請求');
            return;
        }
        
        try {
            console.log('更新狀態為聽取中...');
            this.updateStatus('listening', '正在聽取...');
            
            // 清理任何現有的媒體流
            if (this.mediaStream) {
                console.log('發現現有媒體流，正在清理...');
                this.mediaStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('已停止媒體軌道:', track.kind);
                });
                this.mediaStream = null;
                console.log('等待資源釋放...');
                // 等待一小段時間確保資源釋放
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 檢查是否有麥克風設備
            console.log('檢查瀏覽器是否支援麥克風...');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('瀏覽器不支援麥克風功能');
            }
            console.log('瀏覽器支援麥克風 ✓');

            // 檢查可用的音訊設備
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            if (audioInputs.length === 0) {
                throw new Error('未找到可用的麥克風設備');
            }

            console.log('可用的音訊設備:', audioInputs);
            
            // 檢查權限狀態
            if (navigator.permissions) {
                try {
                    const permission = await navigator.permissions.query({name: 'microphone'});
                    console.log('麥克風權限狀態:', permission.state);
                } catch (e) {
                    console.log('無法查詢權限狀態:', e);
                }
            }
            
            // 取得麥克風權限（使用兼容的音訊設定）
            try {
                console.log('嘗試基本音訊設定...');
                // 使用最基本的設定
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true
                });
                console.log('使用基本音訊設定成功');
            } catch (error) {
                console.error('基本設定也失敗:', error);
                console.log('錯誤類型:', error.name);
                console.log('錯誤訊息:', error.message);
                
                // 提供更詳細的錯誤信息
                if (error.name === 'NotReadableError') {
                    throw new Error('麥克風正在被其他應用程式使用，請關閉其他正在使用麥克風的程式（如Zoom、Teams等）');
                } else if (error.name === 'NotAllowedError') {
                    throw new Error('麥克風權限被拒絕，請允許網站使用麥克風');
                } else if (error.name === 'NotFoundError') {
                    throw new Error('找不到麥克風設備，請檢查設備連接');
                } else {
                    throw error;
                }
            }

            // 隱藏權限模態框
            this.hidePermissionModal();

            // 建立 AudioContext 來處理音訊格式轉換
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext 採樣率:', this.audioContext.sampleRate);
            
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
            
            // 計算重採樣比率
            this.resampleRatio = this.audioContext.sampleRate / 16000;
            console.log('重採樣比率:', this.resampleRatio);
            
            const self = this; // 保存 this 上下文
            this.processor.onaudioprocess = (e) => {
                if (self.sttSession && self.isRecording) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // 重採樣到 16kHz
                    const resampledData = self.resampleTo16kHz(inputData);
                    const pcmData = self.convertToPCM16(resampledData);
                    self.sttSession.sendAudio(pcmData);
                }
            };
            
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            // 開始 STT 會話
            console.log('正在建立 STT 會話...');
            console.log('Client 物件:', this.client);
            console.log('檢查 SDK 版本 - startSTT 函數:', typeof this.client.startSTT);
            
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('STT 會話建立逾時')), 10000);
            });
            
            try {
                this.sttSession = await Promise.race([
                    this.client.startSTT({
                        language: 'zh-TW'
                    }),
                    timeout
                ]);
                console.log('STT 會話建立成功:', this.sttSession);
            } catch (error) {
                console.error('STT 會話建立失敗:', error);
                throw error;
            }

            // 設置 STT 事件處理器
            console.log('設置 STT 事件處理器...');
            this.sttSession.onRecognizing((result) => {
                if (this.transcriptText) {
                    this.transcriptText.textContent = result.text + '...';
                }
                // 即時更新到文字輸入框
                this.textInput.value = result.text;
                this.updateInputCounter(result.text.length);
            });

            this.sttSession.onResult((result) => {
                console.log('STT 結果:', result);
                if (this.transcriptText) {
                    this.transcriptText.textContent = result.text;
                }
                // 將最終結果輸出到文字輸入框
                this.textInput.value = result.text;
                this.updateInputCounter(result.text.length);
                
                // 不再自動播放，等待用戶點擊發送
            });

            this.sttSession.onError((error) => {
                console.error('STT 錯誤:', error);
                this.updateStatus('error', '語音識別錯誤');
            });

            console.log('事件處理器設置完成，開始錄音...');
            // 開始錄音
            this.isRecording = true;
            
            // 更新UI (僅在元素存在時)
            if (this.micButton) {
                this.micButton.textContent = '🛑';
                this.micButton.classList.add('recording');
            }
            if (this.transcriptText) {
                this.transcriptText.textContent = '正在聽取您的語音...';
            }
            
            console.log('錄音啟動完成！isRecording:', this.isRecording);

        } catch (error) {
            console.error('開始錄音失敗:', error);
            
            // 重要：發生錯誤時重置錄音狀態
            this.isRecording = false;
            if (this.micButton) {
                this.micButton.textContent = '🎤';
                this.micButton.classList.remove('recording');
            }
            
            // 釋放媒體流
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            if (error.name === 'NotAllowedError') {
                this.updateStatus('error', '麥克風權限被拒絕');
                this.showPermissionModal();
            } else if (error.name === 'NotFoundError') {
                this.updateStatus('error', '未找到麥克風設備');
                if (this.transcriptText) {
                    this.transcriptText.textContent = '請確保您的電腦有麥克風設備，或嘗試重新整理頁面';
                }
            } else if (error.message.includes('麥克風')) {
                this.updateStatus('error', error.message);
                if (this.transcriptText) {
                    this.transcriptText.textContent = error.message;
                }
            } else {
                this.updateStatus('error', '無法開始錄音');
                if (this.transcriptText) {
                    this.transcriptText.textContent = '錄音功能暫時無法使用，請檢查麥克風設備';
                }
            }
        }
    },

    async stopRecording() {
        try {
            console.log('[Avatar.stopRecording] 停止錄音函數開始執行');
            this.updateStatus('processing', '處理中...');

            this.isRecording = false;

            // 停止媒體流
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('已停止媒體軌道:', track.kind);
                });
                this.mediaStream = null;
            }

            // 停止 AudioContext
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
            
            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            // 停止 STT 會話
            if (this.sttSession) {
                this.sttSession.stop();
                this.sttSession = null;
            }

            // 更新UI (僅在元素存在時)
            if (this.micButton) {
                this.micButton.textContent = '🎤';
                this.micButton.classList.remove('recording');
            }
            
            this.updateStatus('ready', '準備就緒');

        } catch (error) {
            console.error('停止錄音失敗:', error);
            
            // 確保狀態正確重置
            this.isRecording = false;
            if (this.micButton) {
                this.micButton.textContent = '🎤';
                this.micButton.classList.remove('recording');
            }
            
            // 釋放媒體流
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            this.updateStatus('error', '停止錄音失敗');
        }
    },

    showSTTDisabledMessage: function() {
        this.updateStatus('error', 'STT 功能暫時禁用');
        if (this.transcriptText) {
            this.transcriptText.textContent = 'STT 功能暫時禁用，請使用下方文字輸入框';
        }
        
        // 聚焦到文字輸入框
        if (this.textInput) {
            this.textInput.focus();
        }
        
        // 3秒後恢復狀態
        setTimeout(() => {
            Avatar.updateStatus('ready', '準備就緒');
            if (Avatar.transcriptText) {
                Avatar.transcriptText.textContent = '點擊麥克風開始語音輸入，或使用文字輸入...';
            }
        }, 3000);
    },

    speak: async function (text) {
        try {
            console.log('[Avatar.speak] 正在播放文字 (模式:', this.currentMode, '):', text);
            
            // 使用專門的函數調用日誌
            if (typeof TestUtils !== 'undefined' && TestUtils.logFunctionCall) {
                TestUtils.logFunctionCall('Avatar.speak', `正在播放文字: "${text}" (模式: ${this.currentMode})`);
            }
            
            if (!this.isInitialized) {
                console.error('[Avatar.speak] ❌ Avatar 系統未初始化');
                this.updateStatus('error', '系統未準備好');
                return;
            }
            
            this.updateStatus('processing', '播放中...');

            // 直接模式播放
            await this.speakDirectMode(text);

        } catch (error) {
            console.error('❌ 播放文字失敗:', error);
            this.updateStatus('error', '播放失敗: ' + error.message);
        }
    },


    speakDirectMode: async function(text) {
        console.log('[Avatar.speakDirectMode] 使用直接模式播放...');
        
        try {
            // 確保有活動的直接會話
            if (!this.directSession) {
                console.log('[Avatar.speakDirectMode] 建立新的直接會話...');
                await this.createDirectSession();
            }
            
            if (!this.directSession) {
                throw new Error('無法建立直接會話');
            }

            // 使用官方 SDK 播放文字（返回 Promise<void>）
            await this.directSession.speak(text);
            console.log('[Avatar.speakDirectMode] ✅ 官方 SDK 播放成功:', text);
            this.updateStatus('ready', '播放完成');

        } catch (error) {
            console.error('[Avatar.speakDirectMode] 直接模式播放失敗:', error);
            
            // 嘗試重新建立會話
            this.directSession = null;
            throw error;
        }
    },

    createDirectSession: async function() {
        try {
            console.log('[Avatar.createDirectSession] 建立 HeyGen 直接會話...');
            
            if (!this.client) {
                throw new Error('AI3STTS 客戶端未初始化');
            }

            // 使用官方 SDK 建立會話
            this.directSession = await this.client.createOfficialAvatarSession({
                avatarId: this.avatarId,
                voiceId: this.voiceId,
            });

            console.log('[Avatar.createDirectSession] ✅ 官方 SDK 會話建立成功');
            
            // 同時創建 HeyGenDirectSession 以支援新功能
            try {
                console.log('[Avatar] 同時創建 HeyGen 直接會話以支援新功能...');
                const heygenDirectSession = await this.client.createHeyGenDirectSession({
                    avatarId: this.avatarId,
                    voiceId: this.voiceId,
                });
                
                console.log('[Avatar] HeyGenDirectSession 創建成功:', heygenDirectSession.sessionId);
                console.log('[Avatar] Session type check:', heygenDirectSession.constructor.name);
                // 避免 instanceof 檢查不存在的類別
                if (window.AI3STTS && window.AI3STTS.HeyGenDirectSessionImpl) {
                    console.log('[Avatar] Session instanceof check:', heygenDirectSession instanceof window.AI3STTS.HeyGenDirectSessionImpl);
                } else {
                    console.log('[Avatar] HeyGenDirectSessionImpl 類別未定義，跳過 instanceof 檢查');
                }
                
                // 創建播放器實例
                const container = document.getElementById('heygen-player');
                if (container && heygenDirectSession) {
                    console.log('[Avatar] 正在創建 HeyGenPlayer...');
                    console.log('[Avatar] Container exists:', !!container);
                    console.log('[Avatar] Container id:', container.id);
                    console.log('[Avatar] HeyGenDirectSession 詳細信息:', {
                        sessionId: heygenDirectSession.sessionId,
                        livekitUrl: heygenDirectSession.livekitUrl,
                        livekitToken: heygenDirectSession.livekitToken,
                        realtimeEndpoint: heygenDirectSession.realtimeEndpoint
                    });
                    
                    try {
                        this.player = await this.client.createPlayer(container, heygenDirectSession);
                        console.log('[Avatar] ✅ HeyGenPlayer 創建成功，類型:', this.player.constructor.name);
                        console.log('[Avatar] HeyGenPlayer 可用方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.player)));
                        console.log('[Avatar] enableAudio 方法存在:', typeof this.player.enableAudio === 'function');
                        console.log('[Avatar] disableAudio 方法存在:', typeof this.player.disableAudio === 'function');
                        console.log('[Avatar] setVolume 方法存在:', typeof this.player.setVolume === 'function');
                        console.log('[Avatar] pause 方法存在:', typeof this.player.pause === 'function');
                        console.log('[Avatar] resume 方法存在:', typeof this.player.resume === 'function');
                        
                        // 為相容性添加 mute/unmute 別名（如果不存在）
                        if (!this.player.mute && this.player.disableAudio) {
                            this.player.mute = this.player.disableAudio.bind(this.player);
                            console.log('[Avatar] 添加 mute 方法別名');
                        }
                        if (!this.player.unmute && this.player.enableAudio) {
                            this.player.unmute = this.player.enableAudio.bind(this.player);
                            console.log('[Avatar] 添加 unmute 方法別名');
                        }
                    } catch (createPlayerError) {
                        console.error('[Avatar] createPlayer 方法失敗:', createPlayerError);
                        console.error('[Avatar] createPlayer 錯誤堆疊:', createPlayerError.stack);
                        
                        // 手動創建一個包含必要方法的 player 物件
                        console.log('[Avatar] 嘗試手動創建 player 物件...');
                        const videoElement = container.querySelector('#heygen-video') || container.querySelector('video');
                        if (videoElement) {
                            this.player = {
                                videoElement: videoElement,
                                enableAudio: () => {
                                    videoElement.muted = false;
                                    console.log('[Avatar] 音頻已啟用（手動實現）');
                                },
                                disableAudio: () => {
                                    videoElement.muted = true;
                                    console.log('[Avatar] 音頻已禁用（手動實現）');
                                },
                                // 為相容性添加 mute/unmute 別名
                                mute: function() {
                                    this.disableAudio();
                                },
                                unmute: function() {
                                    this.enableAudio();
                                },
                                setVolume: (volume) => {
                                    videoElement.volume = Math.max(0, Math.min(1, volume));
                                    console.log('[Avatar] 音量設置為:', videoElement.volume);
                                },
                                pause: () => {
                                    videoElement.pause();
                                    console.log('[Avatar] 播放已暫停（手動實現）');
                                },
                                resume: () => {
                                    videoElement.play().catch(e => console.warn('播放失败:', e));
                                    console.log('[Avatar] 播放已恢復（手動實現）');
                                },
                                disconnect: () => {
                                    console.log('[Avatar] 斷開連接（手動實現）');
                                }
                            };
                            console.log('[Avatar] ✅ 手動創建的 player 物件已就緒');
                        }
                    }
                } else {
                    console.warn('[Avatar] 無法創建 HeyGenPlayer: container=', !!container, 'session=', !!heygenDirectSession);
                }
            } catch (error) {
                console.error('[Avatar] 創建 HeyGenPlayer 失敗（不影響官方 SDK 功能）:', error);
                console.error('[Avatar] 錯誤堆疊:', error.stack);
            }
            
            // 取得媒體容器並初始化官方 Avatar
            const container = document.getElementById('heygen-player');
            if (container) {
                console.log('[Avatar] 初始化官方 Avatar 到容器...');
                this.updateStatus('initializing', '初始化 Avatar...');
                
                await this.directSession.initialize(container);
                
                console.log('[Avatar] ✅ 官方 Avatar 初始化成功');
                this.updateStatus('ready', '準備就緒');
            } else {
                console.warn('[Avatar] heygen-player 容器未找到，使用無容器模式');
                await this.directSession.initialize();
                this.updateStatus('ready', '準備就緒');
            }
            
            // 監聽狀態變化
            const checkState = () => {
                if (!this.directSession) {
                    console.log('[Avatar] 會話已結束，停止狀態檢查');
                    return;
                }
                
                const state = this.directSession.getState();
                console.log('[Avatar] Avatar 狀態:', state);
                
                switch (state) {
                    case 'connecting':
                        this.updateStatus('initializing', '連接中...');
                        break;
                    case 'connected':
                        this.updateStatus('ready', '準備就緒');
                        break;
                    case 'inactive':
                        this.updateStatus('idle', '未連接');
                        break;
                }
                
                this.updateModeStatus();
            };
            
            // 定期檢查狀態
            const stateInterval = setInterval(() => {
                if (!this.directSession) {
                    clearInterval(stateInterval);
                    return;
                }
                checkState();
            }, 1000);
            
            // 5 秒後停止檢查
            setTimeout(() => {
                clearInterval(stateInterval);
            }, 5000)
            
            return this.directSession;

        } catch (error) {
            console.error('[Avatar.createDirectSession] 建立直接會話失敗:', error);
            this.updateStatus('error', '建立直接會話失敗: ' + error.message);
            throw error;
        }
    },


    updateModeStatus: function() {
        if (!this.modeStatus) return;

        let statusText = '';
        let className = 'mode-status';

        // 官方 SDK 模式狀態
        if (this.directSession) {
            const state = this.directSession.getState();
            const stateTexts = {
                'inactive': '未連接',
                'connecting': '連接中',
                'connected': '已連接'
            };
            statusText = `官方SDK模式 (${stateTexts[state] || state})`;
            className += state === 'connected' ? ' mode-direct active' : ' mode-direct connecting';
        } else {
            statusText = '官方SDK模式 (無會話)';
            className += ' mode-direct inactive';
        }

        this.modeStatus.textContent = statusText;
        this.modeStatus.className = className;
    },

    async sendText() {
        if (!this.textInput) return;
        
        const text = this.textInput.value.trim();
        
        if (!text) {
            this.updateStatus('error', '請輸入文字');
            return;
        }

        try {
            // 更新狀態
            this.updateStatus('processing', '發送中...');
            
            // 禁用發送按鈕避免重複發送
            if (this.sendButton) {
                this.sendButton.disabled = true;
            }
            
            // 發送文字到 HeyGen
            await this.speak(text);
            
            // 清空輸入框並避免觸發狀態檢查
            setTimeout(() => {
                this.textInput.value = '';
                this.updateInputCounter(0);
            }, 100);
            
        } catch (error) {
            console.error('發送失敗:', error);
            this.updateStatus('error', '發送失敗');
        } finally {
            // 重新啟用發送按鈕
            if (this.sendButton) {
                this.sendButton.disabled = false;
            }
        }
    },

    updateStatus: function (type, message) {
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator status-${type}`;
            this.statusIndicator.textContent = message;
        }
        console.log(`狀態更新: ${type} - ${message}`);
    },

    updateInputCounter: function (length) {
        if (this.inputCounter) {
            this.inputCounter.textContent = `${length}/1000`;
        }
    },

    // 啟用 STT 功能
    enableSTTFeature: function() {
        console.log('啟用 STT 功能');
        this.enableSTT = true;
        
        if (this.transcriptText) {
            if (this.transcriptText) {
                this.transcriptText.textContent = '點擊麥克風開始語音輸入，或使用文字輸入...';
            }
        }
        
        this.updateStatus('ready', '準備就緒');
    },

    // 禁用 STT 功能
    disableSTTFeature: function() {
        console.log('禁用 STT 功能');
        this.enableSTT = false;
        
        // 如果正在錄音，先停止
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.transcriptText) {
            this.transcriptText.textContent = 'STT 功能已禁用，請使用文字輸入';
        }
        
        this.updateStatus('ready', '準備就緒（僅文字模式）');
    },

    // HeyGen 對話控制方法
    startConversation: async function() {
        console.log('開始 HeyGen 對話');
        
        if (!this.isInitialized) {
            console.error('❌ Avatar 系統未初始化');
            this.updateStatus('error', '系統未準備好');
            return;
        }
        
        try {
            // 直接模式：確保有活動的會話
            if (!this.directSession) {
                console.log('建立新的直接會話...');
                await this.createDirectSession();
            }
            
            // 自動初始化音頻（解決瀏覽器自動播放限制）
            if (this.player) {
                console.log('🔊 自動初始化音頻權限...');
                if (typeof this.player.enableAudio === 'function') {
                    try {
                        const audioEnabled = await this.player.enableAudio();
                        if (audioEnabled) {
                            console.log('✅ 音頻權限初始化成功');
                        } else {
                            console.log('⚠️ 音頻初始化需要用戶互動');
                        }
                    } catch (audioError) {
                        console.log('⚠️ 音頻初始化失敗:', audioError.message);
                    }
                } else if (this.player.videoElement || this.player.audioElement) {
                    // 備用方案：直接設置媒體元素
                    if (this.player.videoElement) {
                        this.player.videoElement.muted = false;
                    }
                    if (this.player.audioElement) {
                        this.player.audioElement.muted = false;
                    }
                    console.log('✅ 音頻已啟用（透過媒體元素）');
                }
            }
            
            this.updateStatus('ready', '對話已開始');
            console.log('✅ 直接模式對話已開始');
        } catch (error) {
            console.error('❌ 開始對話失敗:', error);
            this.updateStatus('error', '開始對話失敗');
        }
    },

    stopConversation: async function() {
        console.log('結束 HeyGen 對話');
        
        try {
            // 斷開 LiveKit 連接
            if (this.player && this.player.disconnect) {
                await this.player.disconnect();
                this.player = null;
                console.log('✅ LiveKit 連接已斷開');
            }
            
            // 直接模式：停止活動的會話
            if (this.directSession) {
                await this.directSession.stop();
                this.directSession = null;
                console.log('✅ 直接會話已停止');
            }
            
            this.updateStatus('ready', '對話已結束');
            console.log('✅ 直接模式對話已結束');
        } catch (error) {
            console.error('❌ 結束對話失敗:', error);
            this.updateStatus('error', '結束對話失敗');
        }
    },

    disconnect: function () {
        console.log('正在斷開 Avatar 連接...');
        
        // 斷開客戶端連接（避免使用 STT 相關功能）
        if (Avatar.client) {
            try {
                // 只斷開非 STT 連接
                console.log('✅ 客戶端準備斷開');
            } catch (error) {
                console.error('❌ 斷開客戶端連接時發生錯誤:', error);
            }
        }
        
        // 重置狀態
        this.isInitialized = false;
        this.updateStatus('ready', '已斷開連接');
    },

    // 音訊處理方法
    resampleTo16kHz: function(inputData) {
        try {
            const inputSampleRate = this.audioContext.sampleRate;
            const outputSampleRate = 16000;
            
            if (inputSampleRate === outputSampleRate) {
                return inputData;
            }
            
            const ratio = inputSampleRate / outputSampleRate;
            const outputLength = Math.floor(inputData.length / ratio);
            const output = new Float32Array(outputLength);
            
            for (let i = 0; i < outputLength; i++) {
                const sourceIndex = Math.floor(i * ratio);
                output[i] = inputData[sourceIndex];
            }
            
            return output;
        } catch (error) {
            console.error('重採樣錯誤:', error);
            return inputData; // 返回原始數據作為備用
        }
    },

    convertToPCM16: function(floatData) {
        try {
            const pcm16 = new Int16Array(floatData.length);
            for (let i = 0; i < floatData.length; i++) {
                // 將 float32 (-1 到 1) 轉換為 int16 (-32768 到 32767)
                const sample = Math.max(-1, Math.min(1, floatData[i]));
                pcm16[i] = sample < 0 ? sample * 32768 : sample * 32767;
            }
            return pcm16;
        } catch (error) {
            console.error('PCM16 轉換錯誤:', error);
            return new Int16Array(0); // 返回空數組作為備用
        }
    }
};

// 權限模態框函數（保留但不使用）
function allowPermission() {
    console.log('用戶允許麥克風權限（STT 功能已禁用）');
    if (Avatar.permissionModal) {
        Avatar.permissionModal.classList.add('hidden');
    }
}

function denyPermission() {
    console.log('用戶拒絕麥克風權限（STT 功能已禁用）');
    if (Avatar.permissionModal) {
        Avatar.permissionModal.classList.add('hidden');
    }
}

// 當頁面載入完成時初始化應用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 載入完成，準備初始化 Avatar...');
    
    // 延遲初始化以確保所有依賴都載入完成
    setTimeout(() => {
        if (typeof Avatar !== 'undefined') {
            Avatar.doLoad();
        } else {
            console.error('❌ Avatar 物件未找到！');
        }
    }, 1000);
});

// 錯誤處理
window.addEventListener('error', (event) => {
    console.error('應用程式錯誤:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的 Promise 拒絕:', event.reason);
});