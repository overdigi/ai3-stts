# AI3-STTS

AI3-STTS 是一個整合 Azure Speech-to-Text (STT) 和 LiveAvatar 虛擬人物的語音互動系統。提供即時語音識別和虛擬人物播放功能，適用於客服、教育、娛樂等多種場景。

## 功能特色

- **即時語音識別**：使用 Azure Speech Services 進行高精度中文語音識別
- **虛擬人物播放**：整合 LiveAvatar SDK 實現虛擬人物語音合成播放
- **WebSocket 即時通訊**：低延遲的音訊資料傳輸
- **純 JavaScript SDK**：無框架依賴，支援現代瀏覽器
- **RESTful API**：標準化的 API 介面設計
- **進階語音設定**：支援語速、穩定度、風格等參數調整

## 系統需求

### 後端
- Node.js 18+
- NPM

### 前端
- 現代瀏覽器 (Chrome 推薦)
- 支援 WebSocket 和 Web Audio API
- 需要 HTTPS 或 localhost 環境使用麥克風

### 第三方服務
- Azure Cognitive Services Speech API
- LiveAvatar API (HeyGen)

## 安裝與設置

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
cp .env.example .env
nano .env
```

`.env` 文件內容：
```env
# 伺服器設定
PORT=3000
NODE_ENV=development

# Azure Speech Services (STT)
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=japaneast

# LiveAvatar API 設定
# 取得方式: https://app.heygen.com/settings?nav=API
LIVEAVATAR_API_KEY=your-liveavatar-api-key
LIVEAVATAR_API_URL=https://api.liveavatar.com

# LiveAvatar 預設 Avatar 和 Voice
# Avatar ID: https://app.heygen.com/avatars
# Voice ID: https://app.heygen.com/voices
# Sandbox 測試用 Avatar ID: dd73ea75-1218-4ef3-92ce-606d5f7fbc0a (Wayne)
AVATAR_ID=your-avatar-id
VOICE_ID=your-voice-id

# CORS 設定
CORS_ORIGIN=http://localhost:3000,http://localhost:8000,http://localhost:8080

# API 認證金鑰 (前端透過 x-api-key header 驗證)
API_KEY=your-api-key
```

### 4. 建構 SDK

```bash
cd ../sdk
npm install
npm run build
```

### 5. 啟動服務

```bash
cd ../server
npm run start:dev    # 開發模式
npm run build && npm run start:prod  # 生產模式
```

## LiveAvatar 整合

### SDK 初始化

```javascript
const client = new AI3STTS({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
});
```

### 建立 Avatar 會話

```javascript
const handle = await client.createLiveAvatarSession({
  avatarId: 'your-avatar-id',
  mediaElement: document.getElementById('avatar-video'), // <video> 元素
  quality: 'high',
  language: 'zh-TW',
  maxSessionDuration: 600,
  voiceSettings: {
    speed: 1.0,
    stability: 0.5,
    style: 0,
  },
  onEvent: (event, data) => {
    console.log('Avatar 事件:', event, data);
  },
});

// 讓 Avatar 說話
handle.speak('你好，我是虛擬助手！');

// 中斷目前播放
handle.interrupt();

// 停止會話
await handle.stop();
```

### 會話參數說明

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `avatarId` | string | 是 | - | Avatar 角色 ID |
| `voiceId` | string | 否 | - | 語音 ID，不填則使用 Avatar 預設語音 |
| `quality` | string | 否 | - | 影像畫質：`very_high`、`high`、`medium`、`low` |
| `isSandbox` | boolean | 否 | `false` | 是否使用 Sandbox 模式（免費測試，限 60 秒） |
| `language` | string | 否 | - | 語言代碼，如 `zh-TW`、`en-US` |
| `maxSessionDuration` | number | 否 | - | 會話最長時間（秒），Sandbox 最多 60，正式最多 1200 |
| `mediaElement` | HTMLMediaElement | 否 | - | 用於顯示 Avatar 影像的 `<video>` 元素 |
| `onEvent` | function | 否 | - | 事件回呼函式 |

### 語音設定參數 (`voiceSettings`)

| 參數 | 類型 | 範圍 | 預設值 | 說明 |
|------|------|------|--------|------|
| `speed` | number | 0.5 - 1.2 | 1.0 | 語速。1.0 為正常速度，0.5 為半速，1.2 為最快 |
| `stability` | number | 0 - 1 | - | 語音穩定度。值越高語音越一致穩定，值越低則帶有更多情感變化。建議 0.5-0.75 |
| `style` | number | 0 - 1 | 0 | 語音風格強度。值越高表現越豐富，但會增加延遲。0 為自然語調 |

### Avatar 事件

| 事件名稱 | 說明 |
|----------|------|
| `avatar_start_talking` | Avatar 開始說話 |
| `avatar_stop_talking` | Avatar 停止說話 |
| `user_start_talking` | 使用者開始說話（如啟用 voiceChat） |
| `user_stop_talking` | 使用者停止說話 |
| `session_stopped` | 會話已結束 |

## STT 語音識別

```javascript
// 開始 STT 會話
const sttSession = await client.startSTT({ language: 'zh-TW' });

// 監聽識別結果
sttSession.onResult((result) => {
  console.log('識別結果:', result.text);
  console.log('信心度:', result.confidence);
});

// 監聽中間結果
sttSession.onRecognizing((result) => {
  console.log('識別中:', result.text);
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

// 停止 STT
sttSession.stop();
```

## API 端點

### REST API

#### POST /liveavatar/token

建立 LiveAvatar session token。

**請求：**
```json
{
  "avatarId": "your-avatar-id",
  "voiceId": "your-voice-id",
  "quality": "high",
  "isSandbox": false,
  "language": "zh-TW",
  "maxSessionDuration": 600,
  "voiceSettings": {
    "speed": 1.0,
    "stability": 0.5,
    "style": 0
  }
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-xxx",
    "sessionToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### GET /liveavatar/config

取得伺服器端預設的 Avatar 配置。

**回應：**
```json
{
  "success": true,
  "config": {
    "avatarId": "your-default-avatar-id",
    "voiceId": "your-default-voice-id"
  }
}
```

### WebSocket

#### STT 語音識別 `/stt`

| 事件 | 方向 | 說明 |
|------|------|------|
| `start-stt` | Client → Server | 開始語音識別 |
| `audio-data` | Client → Server | 發送音訊資料 |
| `stop-stt` | Client → Server | 停止語音識別 |
| `stt-started` | Server → Client | 識別已開始 |
| `stt-result` | Server → Client | 最終識別結果 |
| `stt-recognizing` | Server → Client | 中間識別結果 |
| `stt-error` | Server → Client | 錯誤通知 |
| `stt-stopped` | Server → Client | 識別已停止 |

## 專案結構

```
ai3-stts/
├── server/              # NestJS 後端
│   └── src/
│       ├── stt/         # Azure STT 模組 (WebSocket)
│       └── liveavatar/  # LiveAvatar 模組 (REST)
├── sdk/                 # Browser JavaScript SDK
│   ├── src/index.ts     # SDK 入口
│   └── dist/            # 建構輸出
├── example/             # 基本範例 (HTML + JS)
├── ai3-demo/            # 完整測試工具
└── docs/                # 文件
    └── integration-guide.md
```

## 前端整合注意事項

### LiveAvatar SDK CDN 載入

頁面需載入 LiveAvatar Web SDK 和 EventEmitter polyfill：

```html
<!-- EventEmitter polyfill（LiveAvatar SDK 依賴） -->
<script>
window.events$1 = {
  EventEmitter: class EventEmitter {
    constructor() { this._events = {}; }
    on(event, listener) {
      (this._events[event] = this._events[event] || []).push(listener);
      return this;
    }
    off(event, listener) {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter(l => l !== listener);
      }
      return this;
    }
    emit(event, ...args) {
      (this._events[event] || []).forEach(l => l.apply(this, args));
      return this;
    }
    once(event, listener) {
      const wrapped = (...args) => { this.off(event, wrapped); listener.apply(this, args); };
      return this.on(event, wrapped);
    }
    removeAllListeners(event) {
      if (event) { delete this._events[event]; } else { this._events = {}; }
      return this;
    }
  }
};
</script>

<!-- LiveAvatar Web SDK -->
<script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk@0.0.10/dist/index.umd.js"></script>

<!-- AI3-STTS SDK -->
<script src="/sdk/dist/ai3-stts.min.js"></script>
```

### Video 元素

需要在頁面中加入 `<video>` 元素供 Avatar 影像渲染：

```html
<video id="avatar-video" autoplay playsinline style="width: 100%; max-width: 640px;"></video>
```

## 測試

### 測試頁面

```bash
# 啟動 server 後訪問
http://localhost:3000/demo/test.html
```

測試頁面提供：
- Avatar 會話建立與停止
- 文字輸入播放
- 語速 / 穩定度 / 風格參數調整
- 會話時長設定
- STT 語音識別測試

### 單元測試

```bash
cd server && npm test
cd sdk && npm test
```

## 故障排除

### EventEmitter is not a constructor
LiveAvatar SDK UMD 版本依賴 Node.js `events` 模組。需在載入 SDK 前加入 EventEmitter polyfill（見前端整合注意事項）。

### Token 取得失敗
- 確認 `LIVEAVATAR_API_KEY` 已正確設定
- 確認 `AVATAR_ID` 為有效的 Avatar ID
- 如使用 Sandbox 模式，`AVATAR_ID` 必須為 `dd73ea75-1218-4ef3-92ce-606d5f7fbc0a` (Wayne)

### Errors validating session token
- 確認 `VOICE_ID` 為有效的 LiveAvatar 語音 ID，或留空使用 Avatar 預設語音
- 不要使用舊版 HeyGen v1 格式的 voice ID

### 語速設定超出範圍 (422 Validation Error)
- `speed` 參數範圍為 0.5 - 1.2，超過 1.2 會被 API 拒絕

### Sandbox 會話時長限制
- Sandbox 模式最長 60 秒，正式模式最長 1200 秒（20 分鐘）
- 伺服器端會自動限制，但前端 UI 也應設置合理範圍

### 麥克風權限被拒絕
- 確保使用 HTTPS 或 localhost
- 檢查瀏覽器麥克風權限設定

## 授權

MIT License
