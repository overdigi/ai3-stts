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

## 備註
- 優先完成核心功能 (STT + HeyGen 播放)
- 確保 console 錯誤訊息清晰
- 專注於 Chrome 瀏覽器支援
- 對話記錄由 AI3 處理，不在本系統範圍