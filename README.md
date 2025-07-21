# AI3-STTS

AI3-STTS 是一個整合 Azure Speech-to-Text (STT) 和 HeyGen 虛擬人物的語音互動系統。提供即時語音識別和虛擬人物播放功能，適用於客服、教育、娛樂等多種場景。

## 🚀 功能特色

- **即時語音識別**：使用 Azure Speech Services 進行高精度中文語音識別
- **虛擬人物播放**：整合 HeyGen API 實現虛擬人物語音合成播放
- **WebSocket 即時通訊**：低延遲的音訊資料傳輸
- **純 JavaScript SDK**：無框架依賴，支援現代瀏覽器
- **RESTful API**：標準化的 API 介面設計
- **簡單易用**：提供完整的範例應用程式

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
- HeyGen API

## 🛠️ 安裝與設置

### 1. Clone 專案

```bash
git clone https://github.com/your-org/ai3-stts.git
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

# HeyGen API
HEYGEN_API_KEY=your-heygen-api-key
HEYGEN_API_URL=https://api.heygen.com/v1

# CORS 設定
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

# API 認證
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
# 開發模式
cd ../server
npm run start:dev

# 生產模式
npm run build
npm run start:prod
```

## 📖 使用方式

### SDK 使用

#### 安裝
```bash
# NPM
npm install @ai3/stts-sdk

# 或使用 CDN
<script src="https://unpkg.com/@ai3/stts-sdk/dist/ai3-stts.min.js"></script>
```

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

#### HeyGen 虛擬人物
```javascript
// 取得 iframe URL
const iframeUrl = client.getIframeUrl('avatar-1');
document.getElementById('heygen-iframe').src = iframeUrl;

// 播放文字
await client.speakText('歡迎使用 AI3 STTS 系統', {
  avatarId: 'avatar-1',
  voiceId: 'voice-1'
});
```

### API 端點

#### WebSocket 連接
- **端點**: `/stt`
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

#### REST API

##### POST /heygen/speak
播放文字到 HeyGen 虛擬人物

```javascript
// 請求
{
  "text": "要播放的文字",
  "avatarId": "avatar-1",
  "voiceId": "voice-1"
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

##### GET /heygen/iframe/:avatarId
取得 HeyGen iframe HTML 頁面

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