class AI3STTSDemo {
    constructor() {
        this.client = null;
        this.sttSession = null;
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.isRecording = false;
        this.avatarConfig = null; // 儲存角色配置
        
        // UI Elements
        this.micButton = document.getElementById('mic-button');
        this.transcriptText = document.getElementById('transcript-text');
        this.statusIndicator = document.getElementById('status-indicator');
        this.heygenIframe = document.getElementById('heygen-iframe');
        this.permissionModal = document.getElementById('permission-modal');
        
        // 檢查元素是否正確找到
        console.log('UI Elements check:');
        console.log('micButton:', this.micButton);
        console.log('transcriptText:', this.transcriptText);
        console.log('statusIndicator:', this.statusIndicator);
        
        this.init();
        
        // 測試：添加一個全域點擊測試函數
        window.testMicClick = () => {
            console.log('Test function called!');
            this.startRecording();
        };
    }

    async init() {
        try {
            // 檢查 SDK 版本
            console.log('🔍 檢查 AI3STTS SDK 是否正確載入...');
            if (typeof AI3STTS === 'undefined') {
                throw new Error('AI3STTS SDK 未載入，請清除瀏覽器快取並重新載入頁面');
            }
            
            // 初始化 AI3-STTS 客戶端
            this.client = new AI3STTS({
                apiUrl: 'http://localhost:3000',
                // apiKey: 'your-api-key' // 暫時禁用 API Key 驗證
            });

            // 載入 HeyGen iframe
            await this.loadHeyGenAvatar();

            // 設置事件監聽器
            this.setupEventListeners();

            // 檢查麥克風權限
            await this.checkMicrophonePermission();

            this.updateStatus('ready', '準備就緒');
        } catch (error) {
            console.error('初始化失敗:', error);
            this.updateStatus('error', '初始化失敗');
        }
    }

    async loadHeyGenAvatar() {
        try {
            // 取得可用的角色配置
            const config = await this.client.getAvatarConfigs();
            console.log('可用角色:', config.avatars);

            // 儲存角色配置供後續使用
            this.avatarConfig = config.avatars.length > 0 ? config.avatars[0] : {
                id: 'default-avatar',
                name: '預設角色',
                defaultVoiceId: 'default-voice'
            };

            // 載入真正的 HeyGen iframe
            this.loadRealHeyGenIframe();
            
            console.log('HeyGen avatar 配置完成:', this.avatarConfig);

        } catch (error) {
            console.error('載入 HeyGen avatar 失敗:', error);
        }
    }

    loadRealHeyGenIframe() {
        // 移除現有的 iframe 內容
        this.heygenIframe.style.display = 'none';
        
        // 載入真正的 HeyGen 腳本
        const script = document.createElement('script');
        script.innerHTML = `
            !function(window){
                const host="https://labs.heygen.com",
                url=host+"/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJiYzEzZGQxNzQ4OGE0NGZmYTQ2ZjBjY2Iy%0D%0ANmJhNjEzYSIsInByZXZpZXdJbWciOiJodHRwczovL2ZpbGVzMi5oZXlnZW4uYWkvYXZhdGFyL3Yz%0D%0AL2JjMTNkZDE3NDg4YTQ0ZmZhNDZmMGNjYjI2YmE2MTNhL2Z1bGwvMi4yL3ByZXZpZXdfdGFyZ2V0%0D%0ALndlYnAiLCJuZWVkUmVtb3ZlQmFja2dyb3VuZCI6ZmFsc2UsImtub3dsZWRnZUJhc2VJZCI6ImRl%0D%0AbW8tMSIsInVzZXJuYW1lIjoiMmE3MTA3YzE4YjI5NDA0MThkMWUyNjZjMTAwNTMxYTYifQ%3D%3D&inIFrame=1",
                clientWidth=document.body.clientWidth,
                wrapDiv=document.createElement("div");
                wrapDiv.id="heygen-streaming-embed";
                
                const container=document.createElement("div");
                container.id="heygen-streaming-container";
                
                const stylesheet=document.createElement("style");
                stylesheet.innerHTML=\`
                  #heygen-streaming-embed {
                    z-index: 9999;
                    position: relative;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 300px;
                    border-radius: 10px;
                    border: 2px solid #fff;
                    box-shadow: 0px 8px 24px 0px rgba(0, 0, 0, 0.12);
                    transition: all linear 0.1s;
                    overflow: hidden;
                    opacity: 1;
                    visibility: visible;
                  }
                  #heygen-streaming-container {
                    width: 100%;
                    height: 100%;
                  }
                  #heygen-streaming-container iframe {
                    width: 100%;
                    height: 100%;
                    border: 0;
                  }
                \`;
                
                const iframe=document.createElement("iframe");
                iframe.allowFullscreen=false;
                iframe.title="Streaming Embed";
                iframe.role="dialog";
                iframe.allow="microphone";
                iframe.src=url;
                
                let visible=false,initial=false;
                window.addEventListener("message",(e=>{
                    if(e.origin===host&&e.data&&e.data.type&&"streaming-embed"===e.data.type){
                        if("init"===e.data.action){
                            initial=true;
                            console.log('HeyGen iframe initialized');
                        } else if("show"===e.data.action){
                            visible=true;
                            console.log('HeyGen iframe shown');
                        } else if("hide"===e.data.action){
                            visible=false;
                            console.log('HeyGen iframe hidden');
                        }
                    }
                }));
                
                container.appendChild(iframe);
                wrapDiv.appendChild(stylesheet);
                wrapDiv.appendChild(container);
                
                // 將 HeyGen iframe 嵌入到我們的容器中
                const heygenContainer = document.querySelector('.heygen-container');
                heygenContainer.innerHTML = '';
                heygenContainer.appendChild(wrapDiv);
                
                console.log('HeyGen iframe 已載入');
            }(globalThis);
        `;
        
        document.head.appendChild(script);
    }

    setupEventListeners() {
        // 麥克風按鈕事件
        if (this.micButton) {
            console.log('Setting up mic button event listener');
            this.micButton.addEventListener('click', async () => {
                console.log('=== Mic button clicked! ===');
                console.log('目前 isRecording 狀態:', this.isRecording);
                console.log('按鈕目前樣式類別:', this.micButton.classList.toString());
                console.log('按鈕目前文字:', this.micButton.textContent);
                
                if (this.isRecording) {
                    console.log('執行 stopRecording...');
                    await this.stopRecording();
                } else {
                    console.log('執行 startRecording...');
                    await this.startRecording();
                }
            });
        } else {
            console.error('Mic button not found!');
        }

        // 監聽 HeyGen iframe 訊息
        window.addEventListener('message', (event) => {
            if (event.data.type === 'iframe-ready') {
                console.log('HeyGen iframe 準備完成:', event.data);
            }
        });
    }

    async checkMicrophonePermission() {
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
    }

    showPermissionModal() {
        this.permissionModal.classList.remove('hidden');
    }

    hidePermissionModal() {
        this.permissionModal.classList.add('hidden');
    }

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
                this.updateInputCounter(result.text.length);
            });

            this.sttSession.onResult((result) => {
                console.log('STT 結果:', result);
                this.transcriptText.textContent = result.text;
                this.updateInputCounter(result.text.length);
                
                // 自動播放到 HeyGen
                if (result.text.trim()) {
                    this.speakText(result.text, {
                        avatarId: this.avatarConfig.id,
                        voiceId: this.avatarConfig.defaultVoiceId
                    });
                }
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
    }

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
    }

    async speakText(text, options = null) {
        try {
            console.log('正在播放文字:', text);
            
            // 使用提供的選項或預設角色配置
            const speakOptions = options || {
                avatarId: this.avatarConfig?.id || 'default-avatar',
                voiceId: this.avatarConfig?.defaultVoiceId || 'default-voice'
            };
            
            // 發送給 HeyGen
            const result = await this.client.speakText(text, speakOptions);

            if (result.success) {
                console.log('HeyGen 播放成功:', result.messageId);
                
                // 向 iframe 發送播放訊息
                this.heygenIframe.contentWindow.postMessage({
                    type: 'speak',
                    text: text
                }, '*');
            } else {
                console.error('HeyGen 播放失敗:', result.error);
            }

        } catch (error) {
            console.error('播放文字失敗:', error);
        }
    }

    updateStatus(type, message) {
        this.statusIndicator.className = `status-indicator status-${type}`;
        this.statusIndicator.textContent = message;
    }

    updateInputCounter(length) {
        const counter = document.querySelector('.input-counter');
        counter.textContent = `${length}/1000`;
    }

    // 重採樣到 16kHz
    resampleTo16kHz(input) {
        if (this.resampleRatio <= 1) {
            return input; // 已經是 16kHz 或更低，不需要重採樣
        }
        
        const outputLength = Math.floor(input.length / this.resampleRatio);
        const output = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            const srcIndex = i * this.resampleRatio;
            const index = Math.floor(srcIndex);
            const fraction = srcIndex - index;
            
            if (index + 1 < input.length) {
                output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
            } else {
                output[i] = input[index];
            }
        }
        
        return output;
    }

    // 將 Float32Array 轉換為 PCM16 格式
    convertToPCM16(input) {
        const output = new ArrayBuffer(input.length * 2);
        const view = new DataView(output);
        let offset = 0;
        
        for (let i = 0; i < input.length; i++, offset += 2) {
            const sample = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
        
        return output;
    }
}

// 權限模態框函數
function allowPermission() {
    document.getElementById('permission-modal').classList.add('hidden');
}

function denyPermission() {
    document.getElementById('permission-modal').classList.add('hidden');
    document.getElementById('status-indicator').className = 'status-indicator status-error';
    document.getElementById('status-indicator').textContent = '需要麥克風權限';
}

// 當頁面載入完成時初始化應用
document.addEventListener('DOMContentLoaded', () => {
    window.ai3demo = new AI3STTSDemo();
});

// 錯誤處理
window.addEventListener('error', (event) => {
    console.error('應用程式錯誤:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的 Promise 拒絕:', event.reason);
});