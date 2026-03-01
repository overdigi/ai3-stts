# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI3-STTS is a voice interaction system integrating Azure Speech-to-Text (STT) and LiveAvatar virtual avatars. It provides real-time speech recognition and virtual avatar playback via LiveKit/WebRTC.

## Common Commands

### Server (NestJS Backend)
```bash
cd server
npm install              # Install dependencies
npm run start:dev        # Development mode with watch
npm run build            # Build for production
npm run start:prod       # Production mode
npm test                 # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run lint             # Lint and fix
```

### SDK (JavaScript SDK)
```bash
cd sdk
npm install              # Install dependencies
npm run build            # Build SDK (outputs to dist/)
npm run dev              # Build with watch mode
```

### Running the Demo
```bash
# Start server first
cd server && npm run start:dev

# Then serve the example/ or ai3-demo/ directory with any HTTP server
# e.g. npx serve ../example
```

## Architecture

### Directory Structure
```
ai3-stts/
├── server/              # NestJS backend (TypeScript)
│   └── src/
│       ├── stt/         # Azure STT module (WebSocket gateway + service)
│       └── liveavatar/  # LiveAvatar module (token proxy)
├── sdk/                 # Browser JavaScript SDK (TypeScript, built with Rollup)
│   └── src/index.ts     # SDK entry point
├── example/             # Basic usage example (HTML + JS)
├── ai3-demo/            # Full-featured test tool
└── docs/                # Integration guide and design plans
```

### Key Modules

**Server:**
- `SttModule`: Azure STT integration via WebSocket (`/stt` endpoint)
- `LiveavatarModule`: LiveAvatar token proxy
  - `liveavatar.controller.ts`: `POST /liveavatar/token` + `GET /liveavatar/config`
  - `liveavatar.service.ts`: Calls LiveAvatar API to create session tokens

**SDK (`AI3STTS` class):**
- `startSTT()`: Create STT WebSocket session
- `createLiveAvatarSession()`: Create LiveAvatar session (token → SDK → LiveKit)
- `getConfig()`: Get server-side avatar/voice config

### Data Flow
1. Browser captures audio → SDK sends via WebSocket to `/stt`
2. Server processes audio with Azure Speech SDK → Returns transcription
3. Frontend calls `createLiveAvatarSession()`:
   - SDK requests token from server (`POST /liveavatar/token`)
   - Server calls LiveAvatar API (`POST /v1/sessions/token`) with API key
   - SDK creates `LiveAvatarSession` with token → starts session → LiveKit connects
4. Frontend calls `speak(text)` → Command event via LiveKit data channel → Avatar speaks

### LiveAvatar Integration
- **Mode**: FULL (LiveAvatar handles STT/LLM/TTS pipeline, we use `avatar.speak_text` for direct text)
- **SDK**: `@heygen/liveavatar-web-sdk` loaded via CDN on frontend
- **Server role**: Token proxy only (protects API key)
- **Session lifecycle**: Managed entirely by LiveAvatar SDK on frontend

## Environment Variables

Server requires `.env` file (copy from `.env.example`):
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`: Azure Speech Services
- `LIVEAVATAR_API_KEY`: LiveAvatar API key (from HeyGen dashboard)
- `LIVEAVATAR_API_URL`: LiveAvatar API base URL (default: https://api.liveavatar.com)
- `AVATAR_ID`, `VOICE_ID`: Default avatar and voice IDs
- `API_KEY`: Authentication for REST endpoints

## Important Notes

- LiveAvatar API uses `X-API-KEY` header for auth, `Bearer` token for session operations
- Browser requires HTTPS or localhost for microphone access
- WebSocket endpoint: `/stt` (speech recognition only)
- Sandbox mode: set `isSandbox: true`, uses Wayne avatar (dd73ea75-1218-4ef3-92ce-606d5f7fbc0a), 1-minute limit, no credits
- HeyGen v1 (`@heygen/streaming-avatar`) code preserved in tag `1.0.0`
