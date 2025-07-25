# AI3-STTS Avatar 對話控制測試

這個測試頁面用於測試 Avatar.js 中新增的 HeyGen 對話控制功能。

## 文件說明

- `test.html` - 主要測試頁面
- `test-config.js` - 模擬配置和依賴對象
- `Avatar.js` - Avatar 控制類（包含新的對話控制方法）
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
- **結束對話**：點擊「結束對話」按鈕測試 `Avatar.stopConversation()` 方法

#### STT 語音識別測試
- **開始錄音**：點擊「開始錄音」按鈕測試 `Avatar.startRecording()` 方法
- **停止錄音**：點擊「停止錄音」按鈕測試 `Avatar.stopRecording()` 方法  
- **檢查 STT 狀態**：檢查 STT 系統的初始化狀態和依賴
- **測試 STT 連接**：測試 Socket.io 連接到後端 STT 服務

#### 文字播放測試
- 在左側輸入框中輸入文字
- 點擊「播放文字」按鈕測試 `Avatar.speak()` 方法

#### 日誌控制
- **清除日誌**：清除測試日誌內容
- **匯出日誌**：下載日誌文件供分析

## 測試重點

### 1. 依賴檢查
右側日誌面板會顯示各項依賴的載入狀態：
- Socket.io: WebSocket 連接庫
- AI3STTS: 語音識別 SDK
- Avatar: Avatar 控制對象
- Util: 配置系統（模擬）
- WebChat: AJAX 系統（模擬）

### 2. 對話控制流程
1. Avatar 初始化完成
2. 點擊「開始對話」→ 觀察 HeyGen iframe 是否開始連接
3. 點擊「結束對話」→ 觀察 HeyGen iframe 是否停止連接
4. 檢查日誌中的 iframe 訊息通信

### 3. HeyGen Avatar 影片顯示
1. 點擊「開始對話」啟動 HeyGen 連接
2. 觀察是否顯示真實的 Avatar 影片
3. 測試文字播放功能是否正常

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
- 確認麥克風權限已授予
- 查看「檢查 STT 狀態」的詳細診斷信息

## 預期結果

### 成功載入
- 所有依賴顯示 ✅
- Avatar 狀態顯示「已初始化」
- HeyGen iframe 正常載入並顯示 Avatar 影片

### 對話控制成功
- 點擊「開始對話」後，日誌顯示「conversation-started」訊息
- HeyGen Avatar 影片開始顯示並建立 WebRTC 連接
- 點擊「結束對話」後，日誌顯示「conversation-stopped」訊息

### 文字播放成功
- 輸入文字並播放後，HeyGen Avatar 開始語音播放
- 日誌顯示「正在播放: [文字內容]」訊息