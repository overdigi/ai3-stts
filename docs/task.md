# AI3-STTS 開發任務清單

## 專案初始化
- [ ] 建立專案基本結構
- [ ] 初始化 Git 版本控制
- [ ] 建立 .gitignore 文件

## 後端開發 (NestJS)

### 環境設置
- [ ] 初始化 NestJS 專案
- [ ] 安裝必要依賴套件
  - [ ] @nestjs/websockets
  - [ ] @nestjs/platform-socket.io
  - [ ] @azure/cognitiveservices-speech-sdk
  - [ ] axios (for HeyGen API)
- [ ] 建立環境變數範本 (.env.example)
- [ ] 設定 TypeScript 配置

### 核心模組開發
- [ ] 建立 STT 模組
  - [ ] STT Controller
  - [ ] STT Service
  - [ ] WebSocket Gateway
  - [ ] Azure STT 整合
- [ ] 建立 HeyGen 模組
  - [ ] HeyGen Controller
  - [ ] HeyGen Service
  - [ ] API 整合
  - [ ] iframe 生成功能
- [ ] 實作 API 認證中介軟體
- [ ] 設定 CORS 政策

### API 端點實作
- [ ] WebSocket `/stt` 端點
- [ ] POST `/heygen/speak` 端點
- [ ] GET `/heygen/config` 端點
- [ ] GET `/heygen/iframe/:avatarId` 端點

## SDK 開發

### SDK 基礎設置
- [ ] 初始化 TypeScript 專案
- [ ] 設定 Rollup 建構配置
- [ ] 建立 package.json 配置

### SDK 功能實作
- [ ] AI3STTS 主類別
- [ ] STT Session 管理
- [ ] WebSocket 連線處理
- [ ] HeyGen API 包裝
- [ ] 錯誤處理機制
- [ ] 事件管理系統

### SDK 建構與發布
- [ ] 建立開發版本 (ai3-stts.js)
- [ ] 建立壓縮版本 (ai3-stts.min.js)
- [ ] 準備 NPM 發布配置
- [ ] 建立 SDK 文件

## 範例應用程式
- [ ] 建立 index.html
- [ ] 實作錄音功能
- [ ] 整合 STT 功能
- [ ] 整合 HeyGen iframe
- [ ] 建立使用者介面
- [ ] 錯誤處理與提示

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