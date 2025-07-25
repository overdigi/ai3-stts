// 模擬 Util 配置對象
window.Util = {
    config: {
        avaterApiUrl: 'http://localhost:3000',
        avaterApiKey: 'test-api-key',
        autoStartConversation: false // 預設不自動開始，透過測試按鈕控制
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
                // 模擬成功的角色配置回應（使用後端環境變數中的 Avatar ID）
                const mockResponse = {
                    avatars: [{
                        id: 'bc13dd17488a44ffa46f0ccb26ba613a',
                        name: '1966長照專線',
                        defaultVoiceId: '3b1633a466c44379bf8b5a2884727588'
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
        const logEntry = `[${timestamp}] ${message}`;
        
        console.log(logEntry, data || '');
        
        // 顯示在頁面上
        const logContainer = document.getElementById('test-log');
        if (logContainer) {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = `<span class="log-time">${timestamp}</span> ${message}`;
            if (data) {
                logElement.innerHTML += `<pre class="log-data">${JSON.stringify(data, null, 2)}</pre>`;
            }
            logContainer.appendChild(logElement);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    },
    
    clearLog: function() {
        const logContainer = document.getElementById('test-log');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
        console.clear();
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
    }
};

console.log('🔧 測試配置已載入');
console.log('Util:', window.Util);
console.log('WebChat:', window.WebChat);