# HeyGen 長文字播放中斷問題調查報告

## 問題描述

使用 HeyGen Streaming Avatar API 播放長文字時（約 300+ 字元），Avatar 會在播放途中停止，恢復 idle 狀態，但不會報錯。

## 測試結果

### 測試文字
約 1,500 字元的中文政策文件。

### 實際播放
- 第一次測試：播放約 280 字元後停止
- 第二次測試：播放約 330 字元後停止
- HeyGen API 回報 `speak()` 成功完成，但實際只播放部分內容

### Console Log
```
[OfficialAvatarSession] 🗣️ Avatar 開始說話
[OfficialAvatarSession] ✅ speak() 完成    ← API 說完成了
[OfficialAvatarSession] 🤫 Avatar 停止說話
```

## 排除的原因

### 1. STT 自動打斷 ❌
- 沒有出現 `USER_START` 事件
- 不是麥克風偵測到聲音導致中斷

### 2. TaskMode.ASYNC 問題 ❌
- 改用 `TaskMode.SYNC` 後問題仍存在
- API 正確等待「完成」再返回，但「完成」本身是錯誤的

### 3. 語言設定 ❌
- 將 `language: "en"` 改為 `language: "zh"` 後問題仍存在

### 4. activityIdleTimeout ❌
- 設定為 3600 秒（1 小時），不是預設的 120 秒
- 不是閒置超時導致

## 確認的原因

### HeyGen 中文文字隱藏限制

**官方文件說明：**
- [HeyGen API Limits](https://docs.heygen.com/reference/limits) 說 Interactive Avatar 單次最多 **1,000 字元**

**實際測試結果：**
- 中文文字約 **300 字元** 就會被截斷
- API 不會報錯，而是靜默截斷並回報「完成」

**可能原因：**
1. HeyGen 對中文有未公開的字元限制
2. 語音合成引擎對中文處理的限制
3. 中文字元在內部處理時可能佔用更多空間

## 相關社群討論

- [Avatar doesn't speak according to sent text](https://docs.heygen.com/discuss/66b34e32f316850051bb9abe) - 有用戶反映中文播放不完整
- [API Character Limit Error](https://docs.heygen.com/discuss/674292a5124fe50018a3b207) - 字元限制相關討論

## 解決方案

### 文字分段播放

將長文字按句號、問號、驚嘆號分割成多個小段（每段不超過 300 字元），依序播放。

```typescript
// 分段邏輯
const MAX_CHUNK_LENGTH = 300;
const chunks = splitTextIntoChunks(text, MAX_CHUNK_LENGTH);

for (const chunk of chunks) {
  await avatarRef.speak({
    text: chunk,
    taskType: TaskType.REPEAT,
    taskMode: TaskMode.SYNC,  // 等待這段播放完成再播下一段
  });
}
```

### 實作位置
- 檔案：`sdk/src/index.ts`
- 類別：`OfficialAvatarSession`
- 方法：`speak()` 和 `splitTextIntoChunks()`

## SDK 設定參考

```typescript
// sdk/src/index.ts 中的 Avatar 配置
const config: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: this.avatarId,
  voice: {
    rate: 1.0,
    emotion: VoiceEmotion.EXCITED,
    voiceId: this.voiceId,
  },
  language: "zh",  // 中文
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
  activityIdleTimeout: 3600,  // 1 小時
};
```

## 建議

1. **使用分段播放**：超過 300 字元的文字自動分段
2. **監控事件**：加入 `AVATAR_START_TALKING` 和 `AVATAR_STOP_TALKING` 事件監聽
3. **向 HeyGen 回報**：這可能是 HeyGen 的 bug 或未公開的限制，建議向官方反映

## 相關檔案

| 檔案 | 說明 |
|------|------|
| [sdk/src/index.ts](../sdk/src/index.ts) | OfficialAvatarSession 類別，包含 speak() 方法 |
| [ai3-demo/Avatar.js](../ai3-demo/Avatar.js) | 前端 Avatar 控制邏輯 |
| [ai3-demo/test.html](../ai3-demo/test.html) | 測試頁面 |

---

*調查日期：2025-12-02*
