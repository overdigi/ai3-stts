# AI3-STTS 系統規格文件

## 專案概述
AI3-STTS 是一個整合 Azure Speech-to-Text (STT) 和 HeyGen 虛擬人物的語音互動系統。前端透過 JavaScript SDK 使用 Azure STT 進行語音識別，並與 HeyGen 互動播放識別的文字內容。

## 系統架構

### 專案結構
```
ai3-stts/
├── server/                     # NestJS 後端
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── stt/               # Azure STT 模組
│   │   │   ├── stt.controller.ts
│   │   │   └── stt.service.ts
│   │   └── heygen/            # HeyGen 模組
│   │       ├── heygen.controller.ts
│   │       └── heygen.service.ts
│   ├── package.json
│   └── .env
│
├── sdk/                       # JavaScript SDK
│   ├── src/
│   │   └── index.ts          # SDK 主入口
│   ├── dist/
│   │   ├── ai3-stts.js      # 編譯後檔案
│   │   └── ai3-stts.min.js  # 壓縮版
│   └── package.json
│
└── example/                   # 使用範例
    ├── index.html
    └── app.js
```

## 核心功能

### 1. Azure STT 整合
- **即時語音識別**：透過 WebSocket 連接進行即時音訊串流處理
- **語言支援**：以中文 (zh-TW) 為主
- **音訊格式**：接受標準瀏覽器音訊格式，無特定要求
- **即時轉譯**：即時將語音轉換為文字輸出

### 2. HeyGen 整合
- **虛擬人物播放**：透過 iframe 嵌入 HeyGen 虛擬人物
- **角色支援**：支援兩個預設角色，每個角色對應特定語音 ID
- **文字轉語音**：將 STT 識別結果自動傳送給 HeyGen 播放
- **基本播放功能**：專注於文字播放功能，暫不支援情緒或動作控制

### 3. JavaScript SDK
- **簡單易用**：純 JavaScript 實現，無框架依賴
- **瀏覽器支援**：主要支援 Chrome 瀏覽器
- **分發方式**：支援 CDN 和 NPM 安裝
- **錯誤處理**：提供清晰的 console 錯誤訊息

## API 規格

### WebSocket 連接
#### `/stt` - Azure STT WebSocket 連接
- **類型**：WebSocket
- **功能**：即時音訊串流識別
- **訊息格式**：
  ```javascript
  // Client -> Server (音訊資料)
  {
    type: 'audio',
    data: ArrayBuffer | Blob
  }
  
  // Server -> Client (識別結果)
  {
    type: 'result',
    text: string,
    confidence: number,
    language: string
  }
  ```

### REST API 端點

#### `POST /heygen/speak`
- **功能**：讓 HeyGen 虛擬人物說話
- **請求格式**：
  ```json
  {
    "text": "要播放的文字",
    "avatarId": "avatar-1",  // 角色 ID
    "voiceId": "voice-1"     // 語音 ID
  }
  ```
- **回應格式**：
  ```json
  {
    "success": true,
    "messageId": "msg-456"
  }
  ```

#### `GET /heygen/config`
- **功能**：取得可用的角色和語音配置
- **回應格式**：
  ```json
  {
    "avatars": [
      {
        "id": "avatar-1",
        "name": "角色1",
        "defaultVoiceId": "voice-1"
      },
      {
        "id": "avatar-2",
        "name": "角色2",
        "defaultVoiceId": "voice-2"
      }
    ]
  }
  ```

#### `GET /heygen/iframe/:avatarId`
- **功能**：取得 HeyGen iframe HTML
- **參數**：`avatarId` - 虛擬人物 ID
- **回應**：HTML 內容，可直接用於 iframe src

## SDK 使用方式

### 安裝
```bash
# NPM
npm install @ai3/stts-sdk

# 或 CDN
<script src="https://unpkg.com/@ai3/stts-sdk/dist/ai3-stts.min.js"></script>
```

### 初始化
```javascript
const client = new AI3STTS({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});
```

### STT 使用範例
```javascript
// 開始語音識別
const sttSession = await client.startSTT({ 
  language: 'zh-TW' 
});

// 監聽識別結果
sttSession.onResult((result) => {
  console.log('識別結果:', result.text);
  // 自動播放到 HeyGen
  client.speakText(result.text, {
    avatarId: 'avatar-1',
    voiceId: 'voice-1'
  });
});

// 取得麥克風權限並開始錄音
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    sttSession.sendAudio(event.data);
  }
};

mediaRecorder.start(100); // 每 100ms 發送一次

// 停止識別
sttSession.stop();
```

### HeyGen 使用範例
```javascript
// 取得 iframe URL
const iframeUrl = client.getIframeUrl('avatar-1');
document.getElementById('heygen-iframe').src = iframeUrl;

// 直接播放文字
await client.speakText('歡迎使用 AI3 STTS 系統', {
  avatarId: 'avatar-1',
  voiceId: 'voice-1'
});
```

### 完整範例
```html
<!DOCTYPE html>
<html>
<head>
    <title>AI3 STTS Demo</title>
</head>
<body>
    <button id="recordBtn">開始錄音</button>
    <div id="transcript"></div>
    <iframe id="heygen" width="800" height="600"></iframe>
    
    <script src="https://unpkg.com/@ai3/stts-sdk/dist/ai3-stts.min.js"></script>
    <script>
        const client = new AI3STTS({
            apiUrl: 'http://localhost:3000',
            apiKey: 'your-api-key'
        });
        
        // 載入 HeyGen
        document.getElementById('heygen').src = client.getIframeUrl('avatar-1');
        
        let sttSession = null;
        let mediaRecorder = null;
        
        document.getElementById('recordBtn').onclick = async () => {
            if (!sttSession) {
                // 開始錄音
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                sttSession = await client.startSTT({ language: 'zh-TW' });
                
                sttSession.onResult((result) => {
                    document.getElementById('transcript').innerText = result.text;
                    client.speakText(result.text, {
                        avatarId: 'avatar-1',
                        voiceId: 'voice-1'
                    });
                });
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        sttSession.sendAudio(event.data);
                    }
                };
                
                mediaRecorder.start(100);
                document.getElementById('recordBtn').innerText = '停止錄音';
            } else {
                // 停止錄音
                mediaRecorder.stop();
                sttSession.stop();
                sttSession = null;
                document.getElementById('recordBtn').innerText = '開始錄音';
            }
        };
    </script>
</body>
</html>
```

## 環境設定

### Server 環境變數 (.env)
```env
# 伺服器設定
PORT=3000
NODE_ENV=development

# Azure Speech Services
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia

# HeyGen API
HEYGEN_API_KEY=your-heygen-api-key
HEYGEN_API_URL=https://api.heygen.com/v1

# CORS 設定
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

# API 認證
API_KEY=your-api-key
```

## 技術規格

### 後端技術
- **框架**：NestJS (Node.js)
- **語言**：TypeScript
- **WebSocket**：Socket.io
- **語音識別**：Azure Cognitive Services Speech SDK

### SDK 技術
- **語言**：TypeScript/JavaScript
- **建構工具**：Rollup
- **模組格式**：ES6+ 和 CommonJS

### 前端需求
- **純 JavaScript**：無框架依賴
- **Web Audio API**：錄音功能
- **WebSocket**：即時通訊
- **瀏覽器支援**：Chrome (主要)

## 部署說明

### 本地開發環境
```bash
# 1. Clone 專案
git clone https://github.com/your-org/ai3-stts.git
cd ai3-stts

# 2. 安裝 Server 依賴
cd server
npm install
cp .env.example .env
# 編輯 .env 設定 API Keys

# 3. 啟動 Server
npm run dev

# 4. 建構 SDK
cd ../sdk
npm install
npm run build

# 5. 測試範例
cd ../example
# 在瀏覽器開啟 index.html
```

### 提供給 AI3 使用
```bash
# AI3 可以直接在本地端執行
cd ai3-stts/server
npm install
npm run start

# 或者自行部署到其他環境
```

## 安全性考量
1. **API Key 認證**：所有 API 請求需要有效的 API Key
2. **CORS 設定**：可配置允許的來源網域
3. **HTTPS**：生產環境建議使用 HTTPS
4. **環境變數**：敏感資訊透過環境變數配置

## 性能優化
1. **連線池**：WebSocket 連線重用
2. **音訊壓縮**：支援音訊資料壓縮傳輸
3. **快取機制**：HeyGen 設定資訊快取

## 未來擴展
1. **多語言支援**：擴展支援更多語言的語音識別
2. **更多虛擬人物**：支援更多 HeyGen 角色和語音
3. **對話記錄**：提供對話記錄 API（由 AI3 實作）
4. **離線模式**：基本的離線快取功能

## 注意事項
- 系統專注於語音識別和播放功能
- 對話記錄儲存由 AI3 負責處理
- 確保 Azure 和 HeyGen API Key 正確設定
- Chrome 瀏覽器需要 HTTPS 或 localhost 才能使用麥克風