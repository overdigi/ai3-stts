# AI3-STTS 開發任務清單

## 專案初始化 ✅
- [x] 建立專案基本結構
- [x] 初始化 Git 版本控制
- [x] 建立 .gitignore 文件

## 後端開發 (NestJS) ✅

### 環境設置 ✅
- [x] 初始化 NestJS 專案
- [x] 安裝必要依賴套件
  - [x] @nestjs/websockets
  - [x] @nestjs/platform-socket.io
  - [x] microsoft-cognitiveservices-speech-sdk
  - [x] axios (for HeyGen API)
- [x] 建立環境變數範本 (.env.example)
- [x] 設定 TypeScript 配置

### 核心模組開發 ✅
- [x] 建立 STT 模組
  - [x] STT Controller
  - [x] STT Service
  - [x] WebSocket Gateway
  - [x] Azure STT 整合
- [x] 建立 HeyGen 模組
  - [x] HeyGen Controller
  - [x] HeyGen Service
  - [x] API 整合
  - [x] iframe 生成功能
- [x] 實作 API 認證中介軟體
- [x] 設定 CORS 政策

### API 端點實作 ✅
- [x] WebSocket `/stt` 端點
- [x] POST `/heygen/speak` 端點
- [x] GET `/heygen/config` 端點
- [x] GET `/heygen/iframe/:avatarId` 端點

## SDK 開發 ✅

### SDK 基礎設置 ✅
- [x] 初始化 TypeScript 專案
- [x] 設定 Rollup 建構配置
- [x] 建立 package.json 配置

### SDK 功能實作 ✅
- [x] AI3STTS 主類別
- [x] STT Session 管理
- [x] WebSocket 連線處理
- [x] HeyGen API 包裝
- [x] 錯誤處理機制
- [x] 事件管理系統

### SDK 建構與發布 ✅
- [x] 建立開發版本 (ai3-stts.js)
- [x] 建立壓縮版本 (ai3-stts.min.js)
- [x] 準備 NPM 發布配置
- [x] 建立 SDK 文件

## 範例應用程式 ✅
- [x] 建立 index.html
- [x] 實作錄音功能
- [x] 整合 STT 功能
- [x] 整合 HeyGen iframe
- [x] 建立使用者介面
- [x] 錯誤處理與提示

## 測試

### 單元測試
- [ ] STT Service 測試
- [ ] HeyGen Service 測試
- [ ] SDK 核心功能測試

### 整合測試
- [ ] WebSocket 連線測試
- [ ] API 端點測試
- [ ] 端到端測試

### 手動測試
- [ ] Chrome 瀏覽器相容性測試
- [ ] 麥克風權限測試
- [ ] 中文語音識別準確度測試
- [ ] HeyGen 播放測試

## 文件
- [ ] 完成 README.md
- [ ] API 文件
- [ ] SDK 使用指南
- [ ] 部署指南
- [ ] 故障排除指南

## 部署準備
- [ ] 建立 Docker 配置 (選用)
- [ ] 準備生產環境配置
- [ ] 效能優化
- [ ] 安全性檢查

## 交付
- [ ] 程式碼審查
- [ ] 準備交付文件
- [ ] 建立版本標籤
- [ ] 準備給 AI3 的使用說明

## 待確認事項
- [ ] HeyGen API 端點確認
- [ ] 兩個角色的 Avatar ID
- [ ] 對應的 Voice ID
- [ ] Azure Speech 服務區域確認
- [ ] API Key 格式規範

## Azure TTS 需求確認（2026-05-25 業主回覆）

### 說明內容
1. **過去版本**：HeyGen 時期使用 Azure STT（語音辨識），TTS 是 HeyGen 平台自帶聲音，未串接 Azure TTS。
2. **LiveAvatar Lite Mode + Azure TTS 可行性**：
   - 目前採用 Lite Mode，TTS 合成由我方負責
   - 技術上可將 ElevenLabs 替換為 Azure Speech SDK
   - LiveAvatar 端不需要調整
3. **多語系支援**：
   - 每次呼叫時動態帶入 voice name 與 language 參數
   - 由業主根據對話語言自行決定使用哪個聲音
   - 彈性支援多語系需求

### 工時評估
- 約 2～3 個工作天
- 預計 2026-05-28（週三）提供測試分支

## 備註
- 優先完成核心功能 (STT + HeyGen 播放)
- 確保 console 錯誤訊息清晰
- 專注於 Chrome 瀏覽器支援
- 對話記錄由 AI3 處理，不在本系統範圍

## Azure TTS 實作完成記錄（2026-05-25, branch: feature/azure-tts-lite-mode）

### 變更摘要
- 新增 `server/src/liveavatar/azure-tts.service.ts`：使用 `microsoft-cognitiveservices-speech-sdk`
  的 `SpeechSynthesizer.speakTextAsync` 產生 RAW 24kHz / 16-bit / mono PCM
  （`SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm`），格式與舊版 ElevenLabs `pcm_24000` 一致，
  LiveAvatar `repeatAudio` / `sendCommandEvent({ event_type: 'avatar.speak_audio' })` 無需調整。
- 更新 `liveavatar-speak.gateway.ts`：將 `ElevenLabsService` 換成 `AzureTtsService`，
  Socket.IO `speak` event 新增可選欄位 `voiceName`、`language`；為了相容現有 SDK build，
  舊欄位 `voiceId` 仍接受，會被視為 `voiceName`。`speak-chunk` / `speak-end` / `speak-error`
  事件協定保持不變（4096 bytes/chunk、base64）。
- 更新 `liveavatar.module.ts`：移除 `ElevenLabsModule` 依賴，註冊 `AzureTtsService`。
- 更新 `server/.env.example`：
  - `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` 註解補上 TTS 用途說明；
  - 新增 `AZURE_TTS_VOICE_NAME` / `AZURE_TTS_LANGUAGE` 預設值（可被 socket payload 覆寫）；
  - `ELEVENLABS_*` 標記為 DEPRECATED 並註解掉。
- `server/src/elevenlabs/` 目錄與 `elevenlabs` npm 套件暫時保留，方便回滾，但已不再被 import。

### 輸出格式
- Sample rate: 24,000 Hz
- Bit depth: 16-bit signed PCM（little-endian）
- Channels: mono (1)
- Header: 無（raw bytes）
- Transport: 切成 4096 bytes/chunk、base64 編碼，與舊版 ElevenLabs 流程相同

### 預設聲音 / 語系
- voiceName: `zh-TW-HsiaoChenNeural`
- language:  `zh-TW`
- 呼叫端可在 `speak` event 動態帶入 `voiceName` + `language` 覆寫