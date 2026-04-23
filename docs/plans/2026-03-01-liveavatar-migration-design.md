# LiveAvatar 遷移設計

## 背景

HeyGen Interactive Avatar 正在遷移到 LiveAvatar 平台。本專案需從 HeyGen API v1 + `@heygen/streaming-avatar` 遷移至 LiveAvatar API + `@heygen/liveavatar-web-sdk`。

舊版本已保留在 tag `1.0.0`。此次為完全替換，不做雙模式並存。

## 架構變更

### 目前架構

```
Browser → SDK → Server(session管理/speak/keepalive/cleanup) → HeyGen API v1
                Server: heygen-direct.service.ts (448行)
                Server: heygen-direct.controller.ts (211行)
                Server: heygen-direct.gateway.ts (298行)
                Server: heygen-direct-cleanup.service.ts (28行)
```

### 新架構

```
Browser → Server(只做 token proxy) → LiveAvatar API
Browser → LiveAvatar Web SDK(session/speak/events 全在前端)
```

- **Server 端**：只保留一個 `POST /liveavatar/token` 端點，保護 API Key 不暴露到前端
- **前端**：使用 `@heygen/liveavatar-web-sdk` 的 `LiveAvatarSession`
- **模式**：使用 FULL Mode + `avatar.speak_text` command event 發話

## Server 端設計

### 移除

- `server/src/heygen/` 整個目錄（4 個檔案）

### 新增

```
server/src/liveavatar/
├── liveavatar.module.ts        # NestJS module
├── liveavatar.controller.ts    # POST /liveavatar/token
└── liveavatar.service.ts       # 呼叫 LiveAvatar API 產生 token
```

### `POST /liveavatar/token` 端點

**Request:**
```json
{
  "avatarId": "string (required)",
  "voiceId": "string (optional)",
  "quality": "high | medium | low (optional, default: medium)",
  "isSandbox": false
}
```

**內部呼叫：**
```
POST https://api.liveavatar.com/v1/sessions/token
Headers: X-API-KEY: <LIVEAVATAR_API_KEY>
Body: {
  "mode": "FULL",
  "avatar_id": avatarId,
  "is_sandbox": isSandbox,
  "video_settings": { "quality": quality },
  "avatar_persona": { "voice_id": voiceId },
  "interactivity_type": "CONVERSATIONAL"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "sessionToken": "string"
  }
}
```

### 環境變數

```bash
LIVEAVATAR_API_KEY=xxx                              # 取代 HEYGEN_API_KEY
LIVEAVATAR_API_URL=https://api.liveavatar.com       # 新 base URL
API_KEY=xxx                                         # 內部 API 認證（保留）
```

## 前端 SDK 設計

### 移除

- `createHeyGenDirectSession()` 方法
- `createOfficialAvatarSession()` 方法
- 所有 HeyGen REST 呼叫（speak、stop、keepalive）
- `@heygen/streaming-avatar` 依賴

### 新增

```typescript
import { LiveAvatarSession } from '@heygen/liveavatar-web-sdk';

class AI3STTS {
  async createLiveAvatarSession(options: {
    avatarId: string;
    voiceId?: string;
    quality?: 'high' | 'medium' | 'low';
    isSandbox?: boolean;
    onEvent?: (event: string, data: any) => void;
  }): Promise<{
    speak: (text: string) => void;
    interrupt: () => void;
    stop: () => Promise<void>;
    session: LiveAvatarSession;
  }>
}
```

**流程：**
1. 向 server `POST /liveavatar/token` 取得 sessionToken
2. `new LiveAvatarSession(sessionToken, { voiceChat: false })`
3. 綁定事件（avatar_start_talking、avatar_stop_talking 等）
4. `session.start()` — SDK 內部呼叫 `/v1/sessions/start` 並建立 LiveKit 連線
5. 回傳封裝物件

**speak 實作：** 透過 LiveKit data channel 發送 command event
```json
{ "event_type": "avatar.speak_text", "text": "要說的話" }
```

### 依賴更新

```diff
- "@heygen/streaming-avatar": "x.x.x"
+ "@heygen/liveavatar-web-sdk": "^0.0.10"
```

## Demo 頁面

更新 `ai3-demo/` 和 `example/`：
- 選擇 Avatar → 取 token → SDK 建 session → LiveKit 自動渲染影音
- 移除手動 LiveKit 連線程式碼
- 保留 STT 流程不變
- 新增 interrupt 按鈕

## 串接說明文件

`docs/integration-guide.md` — 開發者快速上手指南：

1. **快速開始** — 環境需求、安裝、env 設定
2. **Server 設定** — API Key 取得、啟動
3. **前端串接** — 建立 session、發話、中斷、結束、事件監聽（每步附程式碼）
4. **STT 語音辨識** — WebSocket 連線、音訊格式、辨識結果
5. **Sandbox 開發模式** — 免費測試（Wayne avatar, 1 分鐘限制）
6. **常見問題**

## 實作順序

| Phase | 內容 | 檔案數 |
|-------|------|--------|
| 1 | Server: 新增 `LiveavatarModule` | 3 新增 |
| 2 | Server: 移除 `HeygenModule` + 更新 `app.module.ts` | 5 刪/改 |
| 3 | SDK: 移除舊方法，新增 `createLiveAvatarSession` | 1 改 |
| 4 | SDK: 更新依賴 | 1 改 |
| 5 | Demo: 更新前端頁面 | 2-3 改 |
| 6 | 環境變數: `.env.example`、`CLAUDE.md` | 2 改 |
| 7 | 文件: `docs/integration-guide.md` | 1 新增 |

## 不變的部分

- `SttModule`（Azure STT）
- WebSocket `/stt` 端點
- SDK 的 `startSTT()` 方法
