// var Avatar = {

//     client:null ,
//     avatarId:null,
//     voiceId:null,
//     avatarName:null,

//     doLoad: function () {
//         this.initAvatar();
//     },

//     initAvatar: function (){
//         Avatar.client = new AI3STTS({
//             apiUrl: Util.getConfig("avaterApiUrl"),
//             apiKey: Util.getConfig("avaterApiKey")
//         });
        
//         WebChat.ajax({
//             url: Util.getConfig("avaterApiUrl") + "/heygen/config",
//             method: "GET",
//             success: function (ret) {
//                 var avatar = ret.avatars[0]
//                 Avatar.avatarId = avatar.id;
//                 Avatar.voiceId = avatar.defaultVoiceId;
//                 Avatar.avatarName = avatar.name;
//                 const iframeUrl = Avatar.client.getIframeUrl(Avatar.avatarId);
//                 document.getElementById('heygen-iframe').src = iframeUrl;
                
//             },
//         });
            
//     },

//     speak: async function (text) {
//         var option = {
//             avatarId: Avatar.avatarId,
//             voiceId: Avatar.voiceId
//         }

//         await Avatar.client.speakText(text, option);
//         // WebChat.ajax({
//         //     url: Util.getConfig("avaterApiUrl") + "/heygen/speak",
//         //     type: "post",
//         //     data:{
//         //         "text": text,
//         //         "avatarId": this.avatarId,
//         //         "voiceId": this.voiceId
//         //     },
//         //     success: function (ret) {
//         //     },
//         //     error: function (ret) {
//         //         console.log(ret);
//         //     },
//         // });
//     },


//     disconnect:function(){
//         Avatar.client.disconnect();
    
//     }
// }

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
    heygenIframe: null,
    permissionModal: null,
    textInput: null,
    sendButton: null,
    inputCounter: null,

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
            
            // 初始化 AI3STTS 客戶端
            console.log('正在初始化 AI3STTS 客戶端...');
            Avatar.client = new AI3STTS({
                apiUrl: apiUrl,
                apiKey: apiKey
            });
            console.log('✅ AI3STTS 客戶端初始化成功');
            
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
                    
                    // 載入 HeyGen iframe
                    Avatar.loadHeyGenIframe();
                    Avatar.updateStatus('ready', '準備就緒');
                    Avatar.isInitialized = true;
                    
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
        this.heygenIframe = document.getElementById('heygen-iframe');
        this.permissionModal = document.getElementById('permission-modal');
        this.textInput = document.getElementById('text-input');
        this.sendButton = document.getElementById('send-button');
        this.inputCounter = document.getElementById('input-counter');

        // 檢查元素是否正確找到並記錄
        console.log('=== UI Elements 初始化檢查 ===');
        console.log('micButton:', this.micButton ? '✓' : '✗', this.micButton);
        console.log('transcriptText:', this.transcriptText ? '✓' : '✗', this.transcriptText);
        console.log('statusIndicator:', this.statusIndicator ? '✓' : '✗', this.statusIndicator);
        console.log('heygenIframe:', this.heygenIframe ? '✓' : '✗', this.heygenIframe);
        console.log('textInput:', this.textInput ? '✓' : '✗', this.textInput);
        console.log('sendButton:', this.sendButton ? '✓' : '✗', this.sendButton);
        console.log('inputCounter:', this.inputCounter ? '✓' : '✗', this.inputCounter);
        
        // 設置初始狀態
        if (this.transcriptText) {
            this.transcriptText.textContent = '點擊麥克風開始語音輸入，或使用文字輸入...';
        }
    },

    loadHeyGenIframe: function () {
        if (Avatar.client && Avatar.avatarId) {
            try {
                const iframeUrl = Avatar.client.getIframeUrl(Avatar.avatarId);
                if (this.heygenIframe) {
                    this.heygenIframe.src = iframeUrl;
                    console.log('✅ HeyGen iframe 載入成功:', iframeUrl);
                } else {
                    console.warn('⚠️ HeyGen iframe 元素未找到');
                }
            } catch (error) {
                console.error('❌ 載入 HeyGen iframe 失敗:', error);
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

        // 監聽 HeyGen iframe 訊息
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;
            
            switch (event.data.type) {
                case 'iframe-ready':
                    console.log('HeyGen iframe 準備完成:', event.data);
                    Avatar.updateStatus('ready', '準備就緒');
                    break;
                    
                case 'speak-started':
                    console.log('開始播放語音:', event.data.text);
                    Avatar.updateStatus('processing', '播放中...');
                    break;
                    
                case 'speak-completed':
                    console.log('語音播放完成:', event.data.text);
                    Avatar.updateStatus('ready', '準備就緒');
                    break;
                    
                case 'speak-error':
                    console.error('語音播放錯誤:', event.data.error);
                    Avatar.updateStatus('error', '播放失敗');
                    break;
                    
                // 新增對話狀態處理
                case 'conversation-started':
                    console.log('HeyGen 對話已開始');
                    Avatar.updateStatus('ready', '對話進行中');
                    break;
                    
                case 'conversation-stopped':
                    console.log('HeyGen 對話已結束');
                    Avatar.updateStatus('ready', '準備就緒');
                    break;
            }
        });

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
        console.log('=== startRecording 函數開始執行 ===');
        console.log('目前 isRecording 狀態:', this.isRecording);
        
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
            
            this.processor.onaudioprocess = (e) => {
                if (this.sttSession && this.isRecording) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // 如果需要重採樣到 16kHz
                    const resampledData = this.resampleTo16kHz(inputData);
                    const pcmData = this.convertToPCM16(resampledData);
                    this.sttSession.sendAudio(pcmData);
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
                this.transcriptText.textContent = result.text + '...';
                // 即時更新到文字輸入框
                this.textInput.value = result.text;
                this.updateInputCounter(result.text.length);
            });

            this.sttSession.onResult((result) => {
                console.log('STT 結果:', result);
                this.transcriptText.textContent = result.text;
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
            
            // 更新UI
            this.micButton.textContent = '🛑';
            this.micButton.classList.add('recording');
            this.transcriptText.textContent = '正在聽取您的語音...';
            
            console.log('錄音啟動完成！isRecording:', this.isRecording);

        } catch (error) {
            console.error('開始錄音失敗:', error);
            
            // 重要：發生錯誤時重置錄音狀態
            this.isRecording = false;
            this.micButton.textContent = '🎤';
            this.micButton.classList.remove('recording');
            
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
                this.transcriptText.textContent = '請確保您的電腦有麥克風設備，或嘗試重新整理頁面';
            } else if (error.message.includes('麥克風')) {
                this.updateStatus('error', error.message);
                this.transcriptText.textContent = error.message;
            } else {
                this.updateStatus('error', '無法開始錄音');
                this.transcriptText.textContent = '錄音功能暫時無法使用，請檢查麥克風設備';
            }
        }
    },

    async stopRecording() {
        try {
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

            // 更新UI
            this.micButton.textContent = '🎤';
            this.micButton.classList.remove('recording');
            
            this.updateStatus('ready', '準備就緒');

        } catch (error) {
            console.error('停止錄音失敗:', error);
            
            // 確保狀態正確重置
            this.isRecording = false;
            this.micButton.textContent = '🎤';
            this.micButton.classList.remove('recording');
            
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
            console.log('正在播放文字:', text);
            
            if (!this.isInitialized || !this.client || !this.avatarId) {
                console.error('❌ Avatar 系統未初始化');
                this.updateStatus('error', '系統未準備好');
                return;
            }
            
            var option = {
                avatarId: Avatar.avatarId,
                voiceId: Avatar.voiceId
            };

            // 使用 speakText 方法（避免使用需要 Socket.IO 的功能）
            const result = await Avatar.client.speakText(text, option);

            if (result && result.success) {
                console.log('✅ HeyGen 播放成功:', result.messageId);
                
                // 向 iframe 發送播放訊息
                if (Avatar.heygenIframe && Avatar.heygenIframe.contentWindow) {
                    Avatar.heygenIframe.contentWindow.postMessage({
                        type: 'speak',
                        text: text
                    }, '*');
                    console.log('已向 iframe 發送文字:', text);
                }
                
                this.updateStatus('processing', '播放中...');
                
                // 模擬播放完成（因為可能無法接收到完成事件）
                setTimeout(() => {
                    Avatar.updateStatus('ready', '準備就緒');
                }, text.length * 100); // 根據文字長度估算播放時間
                
            } else {
                console.error('❌ HeyGen 播放失敗:', result?.error || '未知錯誤');
                this.updateStatus('error', '播放失敗');
            }

        } catch (error) {
            console.error('❌ 播放文字失敗:', error);
            this.updateStatus('error', '播放失敗: ' + error.message);
        }
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
            
            // 清空輸入框
            this.textInput.value = '';
            this.updateInputCounter(0);
            
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
            this.transcriptText.textContent = '點擊麥克風開始語音輸入，或使用文字輸入...';
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
        
        if (this.heygenIframe && this.heygenIframe.contentWindow) {
            this.heygenIframe.contentWindow.postMessage({
                type: 'startConversation'
            }, '*');
            this.updateStatus('processing', '正在開始對話...');
            console.log('已發送開始對話指令到 iframe');
        } else {
            console.error('❌ HeyGen iframe 未找到');
            this.updateStatus('error', 'iframe 未載入');
        }
    },

    stopConversation: async function() {
        console.log('結束 HeyGen 對話');
        
        if (this.heygenIframe && this.heygenIframe.contentWindow) {
            this.heygenIframe.contentWindow.postMessage({
                type: 'stopConversation'
            }, '*');
            this.updateStatus('processing', '正在結束對話...');
            console.log('已發送結束對話指令到 iframe');
        } else {
            console.error('❌ HeyGen iframe 未找到');
            this.updateStatus('error', 'iframe 未載入');
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