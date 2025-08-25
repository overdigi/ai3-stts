# AI3-STTS

AI3-STTS 是一個整合 Azure Speech-to-Text (STT) 和 HeyGen 虛擬人物的語音互動系統。提供即時語音識別和虛擬人物播放功能，適用於客服、教育、娛樂等多種場景。

## 🚀 功能特色

- **即時語音識別**：使用 Azure Speech Services 進行高精度中文語音識別
- **虛擬人物播放**：整合 HeyGen API v2 (LiveKit) 實現虛擬人物語音合成播放
- **WebSocket 即時通訊**：低延遲的音訊資料傳輸
- **純 JavaScript SDK**：無框架依賴，支援現代瀏覽器，支援動態模式切換
- **RESTful API**：標準化的 API 介面設計
- **會話管理**：超時計算、自動清理和狀態監控
- **簡單易用**：提供完整的範例應用程式和測試介面

## 📋 系統需求

### 後端
- Node.js 18+
- NPM 或 Yarn

### 前端
- 現代瀏覽器 (Chrome 推薦)
- 支援 WebSocket 和 Web Audio API
- 需要 HTTPS 或 localhost 環境使用麥克風

### 第三方服務
- Azure Cognitive Services Speech API
- HeyGen API v2 (LiveKit)

## 🛠️ 安裝與設置

### 1. Clone 專案

```bash
git clone https://github.com/overdigi/ai3-stts.git
cd ai3-stts
```

### 2. 安裝後端依賴

```bash
cd server
npm install
```

### 3. 環境變數設定

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 文件，填入你的 API Keys
nano .env
```

`.env` 文件內容：
```env
# 伺服器設定
PORT=3000
NODE_ENV=development

# Azure Speech Services
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia

# HeyGen API v2 (LiveKit)
HEYGEN_API_KEY=your-heygen-api-key
HEYGEN_API_URL=https://api.heygen.com/v2
USE_LIVEKIT=true

# HeyGen 直接模式設定 (新增)
# 啟用 HeyGen 直接模式
ENABLE_HEYGEN_DIRECT_MODE=true
# 直接模式會話超時時間（分鐘）
HEYGEN_DIRECT_SESSION_TIMEOUT=10
# 會話清理間隔（分鐘）
HEYGEN_SESSION_CLEANUP_INTERVAL=5

# CORS 設定
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

# API 認證
API_KEY=your-api-key

# HeyGen 角色配置（只需要一組）
AVATAR_ID=avatarId
# VOICE_ID 格式：語音系統ID，例如 zh-TW-HsiaoChenNeural 或 HeyGen 內部 ID
VOICE_ID=zh-TW-HsiaoChenNeural
```

### 4. 建構 SDK

```bash
cd ../sdk
npm install
npm run build
```

### 5. 啟動服務

```bash
# 開發模式
cd ../server
npm run start:dev

# 生產模式
npm run build
npm run start:prod
```

## 🏗️ HeyGen 直接整合

### HeyGen 整合特色
- **直接調用 API**：完全控制會話生命週期
- **即時狀態監控**：掌握會話狀態變化
- **功能**：
  - 即時會話狀態監控
  - 自動會話管理和清理
  - 會話延長 (keepalive)
  - WebSocket 即時通訊
  - 完整的錯誤處理

### SDK 初始化
```javascript
// 初始化 AI3STTS 客戶端
const client = new AI3STTS({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});
```

### 會話管理
```javascript
// 建立會話
const session = await client.createHeyGenDirectSession({
  avatarId: 'your-avatar-id',
  voiceId: 'your-voice-id',
  onSessionUpdate: (status) => {
    console.log('會話狀態:', status);
  }
});

// 使用會話播放文字
await session.speak('你好，我是虛擬助手！');

// 延長會話時間 (Keepalive)
await session.keepalive(); // 重置超時計時器

// 停止會話
await session.stop();
```

### 會話延長 (Keepalive)

```javascript
// 延長會話時間
const response = await fetch('/heygen-direct/session/SESSION_ID/keepalive', {
  method: 'POST',
  headers: { 'x-api-key': 'your-api-key' }
});

if (response.ok) {
  console.log('會話時間已延長');
}
```

### 音效控制

```javascript
// 啟用音效權限
const audioEnabled = await session.player.enableAudio();
if (audioEnabled) {
  console.log('音效已啟用');
}

// 音量控制
await session.player.setVolume(0.8); // 設定音量 0-1

// 靜音控制
await session.player.mute();     // 靜音
await session.player.unmute();   // 取消靜音

// 播放控制
await session.player.pause();    // 暫停播放
await session.player.resume();   // 恢復播放

// 狀態查詢
const isMuted = session.player.isMuted();
const isPlaying = session.player.isPlaying();
const volume = session.player.getVolume();
```

## 📖 使用方式

### 整合 AI3 WebChat (STT → WebChat → HeyGen)

如果您想要將 Demo 改為使用 AI3 WebChat 作為中間層，實現「語音輸入 → AI 對話 → 虛擬人物播放」的完整流程，可以按照以下步驟進行：

#### 1. 取得 STT 語音識別結果

現有的 AI3-STTS SDK 已經提供了語音識別功能，您可以這樣取得結果：

```javascript
// 在現有的 app.js 中，STT 結果處理
this.sttSession.onResult((result) => {
    console.log('STT 識別結果:', result.text);
    
    // 將識別的文字發送到您的 AI3 WebChat API
    this.sendToWebChat(result.text);
});
```

#### 2. 發送文字給 HeyGen 虛擬人物播放

使用現有的 `speakText` 方法將 AI 回應發送給 HeyGen：

```javascript
async sendToHeyGen(aiResponseText) {
    try {
        // 使用現有的 speakText 方法
        await this.speakText(aiResponseText, {
            avatarId: this.avatarConfig?.id || 'default-avatar',
            voiceId: this.avatarConfig?.defaultVoiceId || 'default-voice'
        });
        
        console.log('HeyGen 播放成功:', aiResponseText);
        
    } catch (error) {
        console.error('HeyGen 播放失敗:', error);
    }
}

// 獲取對話 Session ID
getSessionId() {
    if (!this.conversationSessionId) {
        this.conversationSessionId = `session-${Date.now()}`;
    }
    return this.conversationSessionId;
}
```

#### 3. 修改現有的 app.js

在現有的 `app.js` 檔案中修改 STT 結果處理：

```javascript
// 找到現有的 onResult 處理，大約在第 384 行
this.sttSession.onResult(async (result) => {
    console.log('STT 結果:', result);
    this.transcriptText.textContent = result.text;
    this.textInput.value = result.text;
    
    // 新增：發送到 WebChat 並讓 HeyGen 播放回應
    await this.handleWebChatResponse(result.text);
});

// 在 AI3STTSDemo 類別中新增這個方法
async handleWebChatResponse(userText) {
    try {
        this.updateStatus('processing', 'AI 正在思考...');
        
        // 調用您的 WebChat API
        const aiResponse = await this.callWebChatAPI(userText);
        
        // 讓 HeyGen 播放 AI 回應
        await this.speakText(aiResponse);
        this.updateStatus('ready', '準備就緒');
        
    } catch (error) {
        console.error('處理失敗:', error);
        await this.speakText('抱歉，我現在無法回應。');
        this.updateStatus('ready', '準備就緒');
    }
}
```

#### 4. 實作 WebChat API 調用

根據您的 AI3 WebChat API 規格，實作 `callWebChatAPI` 方法：

```javascript
async callWebChatAPI(userText) {
    // 請根據您的 AI3 WebChat API 規格修改此處
    // 這只是一個範例
    return "這是 AI 的回應：" + userText;
}
```

#### 5. 完整流程

整合完成後的流程：

1. **用戶說話** → STT 語音識別
2. **識別結果** → 調用 AI3 WebChat API
3. **AI 回應** → HeyGen 虛擬人物播放

只需要實作 `callWebChatAPI` 方法來調用您的 AI3 WebChat API 即可。

### SDK 使用

#### 安裝

**方法 1: 使用範例中的 SDK**
```html
<!-- 直接引用範例中的 SDK 檔案 -->
<script src="example/ai3-stts.js"></script>
```

**方法 2: 使用編譯後的 SDK**
```html
<!-- 使用最新編譯的 SDK (推薦) -->
<script src="sdk/dist/ai3-stts.min.js"></script>

<!-- 或使用未壓縮版本 (開發用) -->
<script src="sdk/dist/ai3-stts.js"></script>
```

> **注意：** NPM 套件 `@ai3/stts-sdk` 尚未發布。目前請直接使用專案中的 SDK 檔案。

#### 初始化
```javascript
const client = new AI3STTS({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});
```

#### 語音識別
```javascript
// 開始 STT 會話
const sttSession = await client.startSTT({ 
  language: 'zh-TW' 
});

// 監聽識別結果
sttSession.onResult((result) => {
  console.log('識別結果:', result.text);
  console.log('信心度:', result.confidence);
});

// 取得麥克風並開始錄音
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    sttSession.sendAudio(event.data);
  }
};

mediaRecorder.start(100); // 每 100ms 發送一次
```

#### HeyGen 直接會話

##### 創建會話
```javascript
// 創建 HeyGen 直接會話
const session = await client.createHeyGenDirectSession({
  avatarId: 'your-avatar-id',
  voiceId: 'your-voice-id',
  timeout: 600000, // 可選：超時時間（毫秒）
  onSessionUpdate: (status) => {
    console.log('會話狀態更新:', status);
  }
});
```

##### HeyGenPlayer 控制
```javascript
// 創建播放器（自動在 createHeyGenDirectSession 時創建）
const player = session.player;

// 音效控制
await player.enableAudio();
await player.setVolume(0.8);
await player.mute();
await player.unmute();

// 播放控制
await player.pause();
await player.resume();

// 狀態查詢
const isPlaying = player.isPlaying();
const isMuted = player.isMuted();
const volume = player.getVolume();
```

##### 官方 Avatar 初始化
```javascript
// 初始化到指定容器
const container = document.getElementById('avatar-container');
await session.initialize(container);

// 開始播放文字
await session.speak('你好，我是虛擬助手！');

// 停止會話
await session.stop();
```

#### HeyGen 虛擬人物
```javascript
// 播放文字
await client.speakText('歡迎使用 AI3 STTS 系統', {
  avatarId: 'avatar-1',
  voiceId: 'voice-1'
});
```

### API 端點

#### WebSocket 連接

##### STT 語音識別 `/stt`
- **用途**: 即時語音識別

訊息格式：
```javascript
// 客戶端 -> 伺服器 (音訊資料)
{
  type: 'audio',
  data: ArrayBuffer | Blob
}

// 伺服器 -> 客戶端 (識別結果)
{
  type: 'result',
  text: string,
  confidence: number,
  language: string
}
```

##### HeyGen 直接模式 `/heygen-direct`
- **用途**: 即時會話狀態更新和事件通知

連線事件：
```javascript
// 連線成功
socket.on('connect', () => {
  console.log('已連線到 HeyGen Direct 服務');
});

// 會話狀態更新
socket.on('sessionUpdate', (data) => {
  console.log('會話狀態:', data.status);
  // 狀態: idle, initializing, ready, speaking, stopped
});

// 會話事件通知
socket.on('sessionEvent', (event) => {
  console.log('會話事件:', event.type, event.data);
  // 事件類型: created, expired, error
});
```

#### REST API

##### HeyGen LiveKit v2 端點

###### POST /heygen/streaming/session
創建 HeyGen LiveKit 串流會話

```javascript
// 請求
{
  "avatarId": "your-avatar-id",
  "voiceId": "zh-TW-HsiaoChenNeural"
}

// 回應
{
  "sessionId": "session-123",
  "accessToken": "livekit-token",
  "url": "wss://livekit.heygen.com",
  "duration": 600  // 會話時長(秒)
}
```

###### POST /heygen/streaming/session/:sessionId/speak
發送文字到 LiveKit 串流會話

```javascript
// 請求
{
  "text": "要播放的文字",
  "voice": {
    "voice_id": "zh-TW-HsiaoChenNeural"  // 注意：v2 需要嵌套格式
  }
}

// 回應
{
  "success": true,
  "messageId": "msg-456"
}
```

###### POST /heygen/streaming/session/:sessionId/keepalive
延長 LiveKit 串流會話時間

```javascript
// 請求
// 無需 body，僅需要正確的 API key

// 回應
{
  "success": true,
  "message": "會話計時器已重置"
}
```

###### POST /heygen/streaming/session/:sessionId/stop
停止 LiveKit 串流會話

```javascript
// 回應
{
  "success": true
}
```

###### GET /heygen/streaming/session/:sessionId
獲取 LiveKit 會話狀態

```javascript
// 回應
{
  "sessionId": "session-123",
  "status": "active",
  "duration": 600,
  "remainingTime": 450
}
```

##### HeyGen Direct v2 端點 🆕

###### POST /heygen-direct/session
創建 HeyGen 直接會話

```javascript
// 請求
{
  "avatarId": "your-avatar-id",
  "voiceId": "zh-TW-HsiaoChenNeural",
  "timeout": 600000  // 可選：自訂超時時間（毫秒）
}

// 回應
{
  "success": true,
  "sessionId": "direct-session-123",
  "livekitUrl": "wss://heygen-xxx.livekit.cloud",
  "livekitToken": "eyJhbGciOiJIUzI1NiIs...",
  "realtimeEndpoint": "wss://webrtc-signaling.heygen.io/...",
  "message": "HeyGen 直接會話已建立"
}
```

###### POST /heygen-direct/session/:sessionId/speak
發送文字到直接會話

```javascript
// 請求
{
  "text": "要播放的文字"
}

// 回應
{
  "success": true,
  "message": "文字已發送到 HeyGen"
}
```

###### POST /heygen-direct/session/:sessionId/keepalive
延長直接會話時間

```javascript
// 請求
// 無需 body，僅需要正確的 API key

// 回應
{
  "success": true,
  "message": "會話計時器已重置"
}
```

###### POST /heygen-direct/session/:sessionId/stop
停止直接會話

```javascript
// 回應
{
  "success": true,
  "message": "會話已停止"
}
```

###### GET /heygen-direct/session/:sessionId
獲取直接會話狀態

```javascript
// 回應
{
  "sessionId": "direct-session-123",
  "status": "ready",  // idle, initializing, ready, speaking, stopped
  "createdAt": "2024-01-01T12:00:00Z",
  "lastActivityAt": "2024-01-01T12:05:00Z",
  "timeout": 600000,
  "remainingTime": 540000
}
```

##### 傳統端點 (向後相容)

###### POST /heygen/speak
播放文字到 HeyGen 虛擬人物 (舊版 API 或 fallback)

```javascript
// 請求 (v1 格式)
{
  "text": "要播放的文字",
  "avatarId": "avatar-1",
  "voiceId": "voice-1"
}

// 請求 (v2 格式)
{
  "text": "要播放的文字",
  "avatarId": "avatar-1",
  "voice": {
    "voice_id": "zh-TW-HsiaoChenNeural"
  }
}

// 回應
{
  "success": true,
  "messageId": "msg-456"
}
```

##### GET /heygen/config
取得可用的角色和語音配置

```javascript
// 回應
{
  "avatars": [
    {
      "id": "avatar-1",
      "name": "角色1",
      "defaultVoiceId": "voice-1"
    }
  ]
}
```


## 🚀 更新日誌

### v4.1 (2024-08-24)
- 新增會話延長功能 (keepalive)
- 優化超時計算邏輯
- 修正會話 ID 錯誤問題
- 新增 HeyGen Direct API 端點

## 📋 版本遷移指南

### 從舊版本升級

#### 已移除的功能
- **iframe 模式**：不再支援 iframe 整合方式
- **雙模式架構**：統一使用 HeyGen 直接模式
- **舊版 WebRTC API**：移除 `/heygen/webrtc/*` 端點
- **獨立音效控制 API**：音效控制整合到 player 物件中

#### API 變更
```javascript
// 舊版 (已移除)
❌ client.setMode('iframe');
❌ client.getIframeUrl('avatar-1');
❌ fetch('/heygen/webrtc/start');

// 新版 (推薦)
✅ const session = await client.createHeyGenDirectSession({...});
✅ await session.initialize(container);
✅ await session.speak(text);
```

#### 環境變數更新
```bash
# 已移除
❌ DEFAULT_HEYGEN_MODE=iframe

# 保留
✅ ENABLE_HEYGEN_DIRECT_MODE=true
✅ HEYGEN_DIRECT_SESSION_TIMEOUT=10
✅ HEYGEN_SESSION_CLEANUP_INTERVAL=5
```

#### 升級步驟
1. 移除 iframe 相關代碼
2. 使用 `createHeyGenDirectSession()` 替代舊 API
3. 更新環境變數設定
4. 測試音效控制功能
5. 驗證會話管理流程

---

## 🎯 範例應用程式

在 `example/` 目錄中提供了完整的範例應用程式：

```bash
cd example
# 使用任何 HTTP 伺服器開啟 index.html
# 例如：python -m http.server 8080
```

範例功能：
- 麥克風權限管理
- 即時語音識別顯示
- HeyGen 虛擬人物播放
- 錯誤處理和狀態指示
- 響應式 UI 設計

## 🧪 AI3-Demo 測試工具

`ai3-demo/` 目錄提供完整的測試工具，包含詳細的功能測試界面：

### 測試頁面功能

```bash
# 啟動服務後直接訪問
http://localhost:3000/demo/test.html
```

### 主要測試功能

#### 對話控制
```javascript
// 開始對話
await Avatar.startConversation();

// 停止對話  
await Avatar.stopConversation();
```

#### STT 語音識別測試
- **開始 STT**：測試語音識別功能
- **停止 STT**：結束語音識別
- **STT 狀態**：查看連線狀態
- **STT 連線測試**：驗證 WebSocket 連線

#### HeyGen 會話測試
- **創建直接會話**：建立 HeyGen 會話
- **停止直接會話**：結束會話
- **自訂超時會話**：測試會話延長功能
- **發送 Keepalive**：重置會話計時器

#### 音效控制測試
- **啟用音效**：初始化音效權限
- **靜音/取消靜音**：音效開關控制
- **暫停/恢復播放**：播放狀態控制
- **音效狀態查詢**：取得當前音效狀態

#### 整合測試
- **含 STT 模式**：完整語音互動流程
- **不含 STT 模式**：純文字轉語音模式

### Avatar.js 核心功能

測試工具基於 `Avatar.js` 構建，主要功能包括：

- **會話管理**：`createDirectSession()`, `cleanupExpiredSession()`
- **語音功能**：`startRecording()`, `stopRecording()`, `speak()`
- **音效控制**：`enableAudio()`, `mute()`, `unmute()`
- **狀態監控**：`updateStatus()`, `updateModeStatus()`
- **事件監聽**：視頻載入事件、LiveKit 狀態監聽

## 🧪 測試

### 手動測試

1. 啟動後端服務
2. 開啟範例應用程式
3. 點擊麥克風按鈕開始錄音
4. 說話測試語音識別
5. 確認 HeyGen 虛擬人物播放

### 單元測試

```bash
# 後端測試
cd server
npm test

# SDK 測試
cd ../sdk  
npm test
```

## 🔧 開發指南

### 專案結構

```
ai3-stts/
├── server/              # NestJS 後端
│   ├── src/
│   │   ├── stt/        # Azure STT 模組
│   │   └── heygen/     # HeyGen 模組
│   └── package.json
├── sdk/                # JavaScript SDK
│   ├── src/
│   ├── dist/           # 建構輸出
│   └── package.json
├── example/            # 範例應用程式
│   ├── index.html
│   └── app.js
└── docs/              # 文件
    ├── spec.md        # 技術規格
    └── task.md        # 開發任務
```

### 開發工作流

1. 修改源碼
2. 重新建構 SDK：`cd sdk && npm run build`
3. 重啟後端服務：`cd server && npm run start:dev`
4. 測試範例應用程式

## 🚨 注意事項

### 瀏覽器相容性
- 主要支援 Chrome 瀏覽器
- 需要 HTTPS 或 localhost 環境才能使用麥克風
- 確保瀏覽器支援 WebSocket 和 Web Audio API

### API Key 管理
- 請妥善保管 Azure 和 HeyGen 的 API Keys
- 生產環境請使用環境變數管理敏感資訊
- 定期更換 API Keys 以確保安全性

### 效能優化
- WebSocket 連線會自動重用
- 音訊資料採用串流傳輸減少延遲
- HeyGen 配置資訊會進行快取
- LiveKit 提供自動重連和網路優化

### HeyGen API v2 重要變更

**voiceId 參數格式變更**

在 HeyGen API v2 中，voiceId 參數需要使用嵌套的 voice 物件格式：

```javascript
// ❌ v1 格式 (不再支援)
{
  "text": "要播放的文字",
  "voiceId": "zh-TW-HsiaoChenNeural"
}

// ✅ v2 格式 (必須使用)
{
  "text": "要播放的文字",
  "voice": {
    "voice_id": "zh-TW-HsiaoChenNeural"  // 注意：使用 voice_id (底線)
  }
}
```

**為什麼使用 v2？**
- 更穩定的 LiveKit 託管基礎設施
- 自動處理 WebRTC 連線細節
- 內建重連機制提高穩定性
- HeyGen 官方推薦和主要維護版本

## 🐛 故障排除

### 常見問題

**1. 麥克風權限被拒絕**
- 確保使用 HTTPS 或 localhost
- 檢查瀏覽器麥克風權限設定
- 嘗試重新整理頁面

**2. WebSocket 連線失敗**
- 檢查後端服務是否正常運行
- 確認防火牆和網路設定
- 檢查 CORS 設定是否正確

**3. Azure STT 識別失敗**
- 驗證 API Key 和區域設定
- 檢查網路連線到 Azure 服務
- 確認音訊格式和語言設定

**4. HeyGen 播放失敗**
- 檢查 HeyGen API Key 是否有效
- 確認角色和語音 ID 正確
- 查看後端服務日誌

### 日誌和除錯

後端日誌：
```bash
cd server
npm run start:dev
# 查看控制台輸出
```

前端除錯：
- 開啟瀏覽器開發者工具
- 查看 Console 和 Network 標籤
- 檢查 WebSocket 連線狀態

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 📞 支援

如有問題請聯繫：
- 專案負責人：AI3 Team
- 技術支援：[technical-support@example.com]

---

**AI3-STTS** - 讓語音互動更智能、更自然！