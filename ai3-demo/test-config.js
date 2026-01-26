// 模擬 Util 配置對象
window.Util = {
    config: {
        avaterApiUrl: 'http://localhost:3000',
        avaterApiKey: 'kLaBJtvyYqv',
        avatarId: '1be5d18692ca4b33b2af982cbd9caa83',
        voiceId: '4158cf2ef85d4ccc856aacb1c47dbb0c',
        autoStartConversation: false, // 預設不自動開始，透過測試按鈕控制
    },
    
    getConfig: function(key) {
        // 只在第一次調用時記錄，避免重複日誌
        if (!this._loggedKeys) this._loggedKeys = {};
        if (!this._loggedKeys[key]) {
            console.log(`Util.getConfig("${key}"):`, this.config[key]);
            this._loggedKeys[key] = true;
        }
        return this.config[key];
    },
    
    setConfig: function(key, value) {
        console.log(`Util.setConfig("${key}", ${value})`);
        this.config[key] = value;
    }
};

// 模擬 WebChat AJAX 對象
window.WebChat = {
    ajax: function(options) {
        console.log('WebChat.ajax 呼叫:', options);
        
        // 模擬延遲
        setTimeout(() => {
            if (options.url.includes('/heygen/config')) {
                // 模擬成功的角色配置回應（從 Util.config 讀取）
                const mockResponse = {
                    avatars: [{
                        id: Util.config.avatarId,
                        name: '1966長照專線',
                        defaultVoiceId: Util.config.voiceId
                    }]
                };

                console.log('模擬 Avatar 配置回應:', mockResponse);
                if (options.success) {
                    options.success(mockResponse);
                }
            } else {
                // 其他請求的預設回應
                if (options.success) {
                    options.success({ success: true });
                }
            }
        }, 500); // 模擬網路延遲
    }
};

// 測試工具函數
window.TestUtils = {
    log: function(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        
        // 嘗試獲取調用函數的名稱
        let functionName = '';
        try {
            const stack = new Error().stack;
            const stackLines = stack.split('\n');
            // 查找調用者的函數名稱
            for (let i = 2; i < stackLines.length; i++) {
                const line = stackLines[i];
                if (line.includes('test') || line.includes('Avatar') || line.includes('function')) {
                    const match = line.match(/at\s+(\w+)/);
                    if (match && match[1] && match[1] !== 'log' && match[1] !== 'Object') {
                        functionName = `[${match[1]}] `;
                        break;
                    }
                    // 備用：匹配函數名稱的其他模式
                    const altMatch = line.match(/(\w+)@|(\w+)\s*\(/);
                    if (altMatch && (altMatch[1] || altMatch[2])) {
                        const fname = altMatch[1] || altMatch[2];
                        if (fname !== 'log' && fname !== 'Object') {
                            functionName = `[${fname}] `;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            // 如果獲取調用棧失敗，繼續執行
        }
        
        const logEntry = `[${timestamp}] ${functionName}${message}`;
        
        console.log(logEntry, data || '');
        
        // 顯示在頁面上
        const logContainer = document.getElementById('test-log');
        if (logContainer) {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = `<span class="log-time">${timestamp}</span> ${functionName ? `<span style="color: #ffa500; font-weight: bold;">${functionName}</span>` : ''}${message}`;
            if (data) {
                logElement.innerHTML += `<pre class="log-data">${JSON.stringify(data, null, 2)}</pre>`;
            }
            logContainer.appendChild(logElement);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    },
    
    clearLog: function() {
        // 在清除之前記錄觸發方法
        this.log('🧹 測試：清除日誌');
        
        const logContainer = document.getElementById('test-log');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
        console.clear();
        
        // 清除後重新記錄
        this.log('✅ 測試日誌已清除');
    },
    
    toggleAutoStart: function() {
        const currentValue = Util.getConfig('autoStartConversation');
        const newValue = !currentValue;
        Util.setConfig('autoStartConversation', newValue);
        
        const button = document.getElementById('auto-start-btn');
        if (button) {
            button.textContent = newValue ? '停用自動開始' : '啟用自動開始';
            button.className = newValue ? 'test-btn test-btn-danger' : 'test-btn test-btn-success';
        }
        
        TestUtils.log(`自動開始對話已${newValue ? '啟用' : '停用'}`);
    },
    
    // 專門用於記錄函數調用的日誌函數
    logFunctionCall: function(functionName, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] [${functionName}] ${message}`;
        
        console.log(logEntry, data || '');
        
        // 顯示在頁面上
        const logContainer = document.getElementById('test-log');
        if (logContainer) {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = `<span class="log-time">${timestamp}</span> <span style="color: #ffa500; font-weight: bold;">[${functionName}]</span> ${message}`;
            if (data) {
                logElement.innerHTML += `<pre class="log-data">${JSON.stringify(data, null, 2)}</pre>`;
            }
            logContainer.appendChild(logElement);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
};

console.log('🔧 測試配置已載入');
console.log('Util:', window.Util);
console.log('WebChat:', window.WebChat);