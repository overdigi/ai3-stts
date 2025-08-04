# AI3-STTS Avatar 語音互動測試

這個測試頁面用於測試完整的 AI3-STTS 語音互動系統，包含 Azure STT 語音識別和 HeyGen Avatar 播放功能。

## ⚠️ 重要更新提醒 (feature/for-ai3-livekit 分支)

此分支包含重大 API 更新，請在串接前仔細閱讀以下變更：

### 🔄 HeyGen API 升級到 v2 (LiveKit)
- **舊版本**: HeyGen API v1 使用傳統 WebRTC 方式
- **新版本**: HeyGen API v2 使用 LiveKit 託管模式
- **影響**: 所有 HeyGen 相關的 API 呼叫需要更新

### 📝 voiceId 參數格式變更
**舊格式** (v1):
```javascript
// 直接傳遞 voiceId 字串
const payload = {
  text: "你好",
  voiceId: "zh-TW-HsiaoChenNeural"
};
```

**新格式** (v2):
```javascript
// voiceId 需要包裝在 voice 物件中
const payload = {
  text: "你好",
  voice: {
    voice_id: "zh-TW-HsiaoChenNeural"  // 注意：使用 voice_id (底線)
  }
};
```

### ❌ 已移除的功能
1. **音效控制 API**: 不再支援獨立的音效開關控制
2. **舊版 WebRTC API**: `/heygen/webrtc/*` 端點已全部移除
3. **ICE 配置端點**: 不再需要手動處理 ICE/SDP 交換

### ✅ 新增功能
1. **LiveKit 串流會話**: 使用 `/heygen/streaming/session` 創建會話
2. **對話控制**: `startConversation()` 和 `stopConversation()` 方法
3. **自動重連機制**: LiveKit 內建連線穩定性保護

## 🔧 串接調整範例

### 1. 創建 LiveKit 會話 (取代舊版 WebRTC)
**舊方式** (v1):
```javascript
// 需要手動處理 ICE、SDP 等 WebRTC 細節
const response = await fetch('/heygen/webrtc/new', {
  method: 'POST',
  body: JSON.stringify({ quality: 'high' })
});
// 還需要處理 ICE candidates、offer/answer 等...
```

**新方式** (v2 LiveKit):
```javascript
// LiveKit 自動處理所有 WebRTC 細節
const response = await fetch('/heygen/streaming/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    avatarId: 'your-avatar-id',
    voiceId: 'zh-TW-HsiaoChenNeural'
  })
});

const data = await response.json();
// 返回格式：
// {
//   sessionId: 'xxx',
//   accessToken: 'xxx',  // LiveKit 存取令牌
//   url: 'wss://...',    // LiveKit 伺服器地址
//   duration: 600        // 會話時長限制(秒)
// }
```

### 2. 發送文字到 Avatar 播放
**舊方式** (v1):
```javascript
await fetch('/heygen/speak', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "你好",
    voiceId: "zh-TW-HsiaoChenNeural"  // 直接傳遞
  })
});
```

**新方式** (v2):
```javascript
// 方式 1: 使用 LiveKit 串流會話
await fetch(`/heygen/streaming/session/${sessionId}/speak`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "你好",
    voice: {
      voice_id: "zh-TW-HsiaoChenNeural"  // 嵌套格式
    }
  })
});

// 方式 2: 使用 Avatar.js 的 speak 方法
avatar.speak("你好");  // Avatar.js 會自動處理格式轉換
```

### 3. 使用 Avatar.js 對話控制
```javascript
// 初始化 Avatar (自動進行)
const avatar = new Avatar({
  containerId: 'avatar-container',
  apiUrl: 'http://localhost:3000'
});

// 開始對話（建立 LiveKit 連接）
await avatar.startConversation();

// 發送文字
await avatar.speak("你好，我是 AI 助理");

// 開始/停止 STT 錄音
avatar.startRecording();  // 開始語音識別
avatar.stopRecording();   // 停止並取得結果

// 結束對話（斷開 LiveKit 連接）
await avatar.stopConversation();
```

### 4. 處理 LiveKit 連線狀態
```javascript
// Avatar.js 會自動處理連線狀態，可透過事件監聽
avatar.on('conversation-started', () => {
  console.log('LiveKit 連線已建立');
});

avatar.on('conversation-stopped', () => {
  console.log('LiveKit 連線已斷開');
});

avatar.on('avatar-speaking', () => {
  console.log('Avatar 開始說話');
});

avatar.on('avatar-silent', () => {
  console.log('Avatar 停止說話');
});
```

### 5. 環境變數配置更新
```env
# .env 文件需要新增/更新以下設定
HEYGEN_API_URL=https://api.heygen.com/v2  # v2 API
USE_LIVEKIT=true                          # 啟用 LiveKit 模式
AVATAR_ID=your-avatar-id                  # HeyGen Avatar ID
VOICE_ID=zh-TW-HsiaoChenNeural           # 預設語音 ID
```

## 文件說明

- `test.html` - 主要測試頁面（包含完整的測試界面和日誌系統）
- `test-config.js` - 模擬配置和依賴對象
- `Avatar.js` - 完整的 Avatar 控制系統（包含 STT 錄音、音訊處理、對話控制）
- `ai3-stts.js` - AI3STTS SDK
- `README.md` - 此說明文件

## 使用方法

### 1. 啟動後端服務
確保 AI3-STTS 後端服務在 `http://localhost:3000` 運行：

```bash
cd ../server
npm run start:dev
```

### 2. 開啟測試頁面
在瀏覽器中打開 `test.html`：

```bash
# 方法 1: 直接用瀏覽器打開
open test.html

# 方法 2: 使用本地伺服器（推薦）
# 在 ai3-demo 目錄中執行：
python3 -m http.server 8080
# 然後在瀏覽器訪問: http://localhost:8080/test.html
```

### 3. 測試功能

#### 對話控制測試
- **開始對話**：點擊「開始對話」按鈕測試 `Avatar.startConversation()` 方法
  - 啟動 HeyGen Avatar WebRTC 連接
  - 初始化音訊系統
- **結束對話**：點擊「結束對話」按鈕測試 `Avatar.stopConversation()` 方法

#### STT 語音識別測試
- **麥克風按鈕**：點擊麥克風圖標 🎤 開始/停止錄音
  - 自動處理麥克風權限
  - 即時語音轉文字顯示
  - 音訊格式轉換（PCM16, 16kHz）
- **檢查 STT 狀態**：檢查 STT 系統的初始化狀態和依賴
- **測試 STT 連接**：測試 Socket.io 連接到後端 STT 服務

#### 文字播放測試
- 在文字輸入框中輸入文字（支援最多 1000 字）
- 點擊「發送」按鈕或按 Enter 鍵播放文字
- 支援 Shift+Enter 換行

#### 系統診斷
- **日誌系統**：右側面板顯示詳細的系統日誌
- **清除日誌**：清除測試日誌內容
- **匯出日誌**：下載日誌文件供分析
- **系統狀態**：顯示 Avatar 狀態、API 連接等資訊

## 測試重點

### 1. 依賴檢查
右側日誌面板會顯示各項依賴的載入狀態：
- Socket.io: WebSocket 連接庫
- AI3STTS: 語音識別 SDK
- Avatar: Avatar 控制對象
- Util: 配置系統（模擬）
- WebChat: AJAX 系統（模擬）

### 2. 對話控制流程
1. 等待 Avatar 自動初始化完成（檢查系統狀態）
2. 點擊「開始對話」→ 觀察 HeyGen iframe 建立 WebRTC 連接
3. 使用語音錄音或文字輸入進行互動測試
4. 點擊「結束對話」→ 觀察連接正常斷開
5. 檢查日誌中的詳細訊息通信過程

### 3. 語音識別完整流程
1. 點擊麥克風按鈕 🎤 開始錄音
2. 觀察狀態指示器變為「正在聽取...」
3. 說話時觀察即時轉錄結果（以「...」結尾）
4. 停止錄音後查看最終識別結果
5. 識別結果自動填入文字輸入框

### 4. HeyGen Avatar 播放測試
1. 確保對話已開始（Avatar 連接成功）
2. 輸入測試文字或使用 STT 識別結果
3. 點擊發送或按 Enter 鍵
4. 觀察 Avatar 是否開始語音播放和動作
5. 檢查播放狀態變化（播放中 → 準備就緒）

## 故障排除

### 1. SDK 載入失敗
如果看到「AI3STTS: ❌」，檢查：
- 確保 `ai3-stts.js` 文件存在
- 檢查瀏覽器控制台的錯誤訊息
- 確保沒有 CORS 問題

### 2. Avatar 初始化失敗
如果 Avatar 狀態顯示「未初始化」：
- 檢查後端服務是否運行在 `http://localhost:3000`
- 檢查網路連接
- 查看日誌中的錯誤訊息

### 3. HeyGen Avatar 無影片顯示
如果對話開始後沒有顯示 Avatar 影片：
- 檢查 HeyGen API Key 是否正確配置
- 查看瀏覽器控制台的 WebRTC 連接狀態
- 確認網路連接允許 WebRTC 流量

### 4. STT 語音識別失敗
如果 STT 錄音功能無法使用：
- 檢查 Socket.io 是否正確載入（CDN 連接）
- 使用「測試 STT 連接」按鈕檢查後端連接
- 確認麥克風權限已授予（瀏覽器會顯示權限對話框）
- 檢查是否使用 HTTPS 或 localhost（麥克風存取要求）
- 確認沒有其他應用程式佔用麥克風（如 Zoom、Teams）
- 查看「檢查 STT 狀態」的詳細診斷信息

### 5. 音訊權限問題
如果遇到麥克風權限問題：
- 確保在 HTTPS 環境或 localhost 運行
- 點擊瀏覽器網址列的麥克風圖標重新授權
- 清除瀏覽器快取和權限設定
- 嘗試重新整理頁面

## 預期結果

### 成功載入
- 所有依賴顯示 ✅（Socket.io、AI3STTS、Avatar、Util、WebChat）
- Avatar 狀態顯示「已初始化」
- API URL 正確顯示為 `http://localhost:3000`
- HeyGen iframe 正常載入

### 對話控制成功
- 點擊「開始對話」後：
  - 日誌顯示「🚀 呼叫 SDK 方法: Avatar.startConversation()」
  - 系統發送音訊啟用指令到 iframe
  - 日誌顯示「conversation-started」訊息
  - Avatar 狀態變為「對話進行中」
- 點擊「結束對話」後：
  - 日誌顯示「conversation-stopped」訊息
  - Avatar 狀態回復為「準備就緒」

### STT 語音識別成功
- 點擊麥克風按鈕後狀態變為「正在聽取...」
- 說話時即時顯示識別結果（帶「...」）
- 停止錄音後顯示最終識別結果
- 識別內容自動填入文字輸入框
- 字數統計正確更新

### 文字播放成功
- 輸入文字並發送後：
  - 日誌顯示「[Avatar.speak] 正在播放文字: [內容]」
  - Avatar 狀態變為「播放中...」
  - HeyGen Avatar 開始語音播放和動作
  - 播放完成後狀態回復為「準備就緒」

### 完整語音互動流程
1. 語音輸入 → STT 識別 → 文字顯示
2. 文字發送 → HeyGen 播放 → Avatar 語音輸出
3. 整個過程狀態指示器正確變化
4. 日誌記錄完整的互動過程