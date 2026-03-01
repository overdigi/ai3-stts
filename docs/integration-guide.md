# AI3-STTS 串接指南

## 快速開始

### 環境需求

- Node.js 18+
- Azure Speech Services 帳號（用於 STT）
- LiveAvatar API Key（從 [HeyGen Dashboard](https://app.heygen.com/settings?nav=API) 取得）

### 安裝

```bash
# 1. Clone 專案
git clone <repo-url>
cd ai3-stts

# 2. 安裝 Server 依賴
cd server
cp .env.example .env   # 複製環境變數範本
npm install

# 3. 安裝 SDK 依賴並建置
cd ../sdk
npm install
npm run build
```

### 設定環境變數

編輯 `server/.env`：

```bash
# 必填
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=japaneast
LIVEAVATAR_API_KEY=your-liveavatar-api-key

# 選填（前端可動態指定）
AVATAR_ID=your-avatar-id
VOICE_ID=your-voice-id
```

### 啟動

```bash
cd server
npm run start:dev
```

Server 啟動後，用任意 HTTP server 開啟 `example/index.html` 或 `ai3-demo/test.html`。

---

## Server API

Server 只有兩個端點：

### `POST /liveavatar/token`

建立 LiveAvatar session token。前端用此 token 初始化 LiveAvatar SDK。

**Request:**

```json
{
  "avatarId": "avatar-uuid",
  "voiceId": "voice-uuid",
  "quality": "medium",
  "language": "zh",
  "isSandbox": false
}
```

- `avatarId`：必填（若 server 有設 `AVATAR_ID` 環境變數，可省略）
- `voiceId`：選填
- `quality`：`low` | `medium` | `high` | `very_high`，預設 `medium`
- `language`：語言代碼，如 `zh`、`en`、`ja`
- `isSandbox`：開發測試模式，不消耗 credits

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionToken": "token-string"
  }
}
```

### `GET /liveavatar/config`

取得 server 端預設的 Avatar 和 Voice ID。

**Response:**

```json
{
  "success": true,
  "config": {
    "avatarId": "your-avatar-id",
    "voiceId": "your-voice-id"
  }
}
```

---

## 前端串接

### 載入依賴

```html
<!-- Socket.IO（STT 用） -->
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>

<!-- LiveAvatar SDK -->
<script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk/dist/index.umd.js"></script>

<!-- AI3-STTS SDK -->
<script src="path/to/ai3-stts.js"></script>
```

### 初始化 SDK

```javascript
const client = new AI3STTS({
  apiUrl: 'http://localhost:3000',  // Server URL
  apiKey: 'your-api-key',          // 選填：對應 server .env 的 API_KEY
});
```

### 建立 Avatar Session

```javascript
const session = await client.createLiveAvatarSession({
  avatarId: 'your-avatar-id',
  voiceId: 'your-voice-id',       // 選填
  quality: 'medium',               // 選填：low | medium | high | very_high
  language: 'zh',                  // 選填
  isSandbox: false,                // 選填：開發測試模式
  onEvent: (event, data) => {
    console.log('Avatar event:', event, data);
    // 可用事件：
    // - avatar_start_talking: Avatar 開始說話
    // - avatar_stop_talking:  Avatar 停止說話
    // - session_stopped:      會話結束
  },
});
```

SDK 會自動：
1. 向 Server 取得 session token
2. 建立 LiveAvatar session
3. 連接 LiveKit 並渲染影音

### 讓 Avatar 說話

```javascript
session.speak('你好，歡迎使用語音互動系統！');
```

### 中斷說話

```javascript
session.interrupt();
```

### 結束 Session

```javascript
await session.stop();
```

---

## STT 語音辨識

STT 功能獨立於 LiveAvatar，透過 WebSocket 連接到 Server 端的 Azure Speech Services。

### 開始語音辨識

```javascript
const sttSession = await client.startSTT({ language: 'zh-TW' });

// 即時辨識中（尚未確定的文字）
sttSession.onRecognizing((result) => {
  console.log('辨識中:', result.text);
});

// 辨識完成（確定的文字）
sttSession.onResult((result) => {
  console.log('結果:', result.text);
  // 可直接送給 Avatar 說
  session.speak(result.text);
});

sttSession.onError((error) => {
  console.error('STT 錯誤:', error);
});
```

### 傳送音訊資料

音訊格式要求：**PCM 16-bit, 16kHz, mono**

```javascript
// 使用 Web Audio API 擷取並重採樣
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(microphoneStream);
const processor = audioContext.createScriptProcessor(1024, 1, 1);

processor.onaudioprocess = (e) => {
  const pcmData = convertToPCM16(
    resampleTo16kHz(e.inputBuffer.getChannelData(0))
  );
  sttSession.sendAudio(pcmData);
};

source.connect(processor);
processor.connect(audioContext.destination);
```

### 停止語音辨識

```javascript
sttSession.stop();
```

---

## Sandbox 開發模式

Sandbox 模式可免費測試，不消耗 LiveAvatar credits：

```javascript
const session = await client.createLiveAvatarSession({
  avatarId: 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a', // Wayne（Sandbox 專用）
  isSandbox: true,
});
```

**限制：**
- 只能使用 Wayne avatar
- Session 約 1 分鐘後自動結束
- 不消耗 credits

---

## 常見問題

### LiveAvatar SDK 載入失敗

確認有在 HTML 中載入 LiveAvatar SDK CDN：

```html
<script src="https://cdn.jsdelivr.net/npm/@heygen/liveavatar-web-sdk/dist/index.umd.js"></script>
```

### 麥克風無法使用

- 需要 HTTPS 或 localhost 環境
- 檢查瀏覽器麥克風權限設定
- 確認沒有其他程式佔用麥克風

### Session 建立失敗

- 檢查 `LIVEAVATAR_API_KEY` 是否正確
- 確認 Avatar ID 有效（可在 HeyGen Dashboard 查看）
- 嘗試使用 Sandbox 模式測試

### 從 HeyGen v1 遷移

舊版本（HeyGen Interactive Avatar）的程式碼保留在 git tag `1.0.0`。主要變更：

| 舊版 (v1) | 新版 (v2) |
|-----------|-----------|
| `createHeyGenDirectSession()` | `createLiveAvatarSession()` |
| Server 管理 session lifecycle | 前端 SDK 管理 |
| REST API speak/stop/keepalive | LiveKit command events |
| `@heygen/streaming-avatar` | `@heygen/liveavatar-web-sdk` |
| `HEYGEN_API_KEY` | `LIVEAVATAR_API_KEY` |
