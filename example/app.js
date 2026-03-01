// AI3-STTS LiveAvatar Demo Application

const API_URL = 'http://localhost:3000';

let client = null;
let avatarSession = null;
let sttSession = null;
let mediaStream = null;
let audioContext = null;
let isRecording = false;

// --- UI References ---
const statusBadge = document.getElementById('status-badge');
const transcriptText = document.getElementById('transcript-text');
const micButton = document.getElementById('mic-button');
const textInput = document.getElementById('text-input');
const sendButton = document.getElementById('send-button');
const startBtn = document.getElementById('start-btn');
const interruptBtn = document.getElementById('interrupt-btn');
const stopBtn = document.getElementById('stop-btn');

// --- Initialize SDK ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof AI3STTS === 'undefined') {
        updateStatus('error', 'SDK 未載入');
        return;
    }

    client = new AI3STTS({ apiUrl: API_URL });
    setupEventListeners();
    updateStatus('ready', '準備就緒');
    console.log('[Demo] SDK initialized');
});

// --- Event Listeners ---
function setupEventListeners() {
    micButton.addEventListener('click', toggleRecording);

    sendButton.addEventListener('click', sendText);
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendText();
        }
    });
}

// --- Avatar Session ---
async function startSession() {
    try {
        updateStatus('speaking', '建立會話中...');
        startBtn.disabled = true;

        // Load config from server
        const config = await client.getConfig();
        const avatarId = config.avatarId;

        if (!avatarId) {
            throw new Error('Server 未設定 AVATAR_ID');
        }

        avatarSession = await client.createLiveAvatarSession({
            avatarId,
            voiceId: config.voiceId,
            quality: 'medium',
            onEvent: handleAvatarEvent,
        });

        // Hide placeholder
        document.getElementById('avatar-placeholder').classList.add('hidden');

        updateStatus('ready', '已連線');
        interruptBtn.disabled = false;
        stopBtn.disabled = false;
        console.log('[Demo] Session started:', avatarSession.sessionId);
    } catch (error) {
        console.error('[Demo] Start session failed:', error);
        updateStatus('error', error.message);
        startBtn.disabled = false;
    }
}

async function stopSession() {
    try {
        if (avatarSession) {
            await avatarSession.stop();
            avatarSession = null;
        }

        // Show placeholder again
        document.getElementById('avatar-placeholder').classList.remove('hidden');

        updateStatus('ready', '已斷線');
        startBtn.disabled = false;
        interruptBtn.disabled = true;
        stopBtn.disabled = true;
        console.log('[Demo] Session stopped');
    } catch (error) {
        console.error('[Demo] Stop session failed:', error);
    }
}

function interruptAvatar() {
    if (avatarSession) {
        avatarSession.interrupt();
        console.log('[Demo] Interrupted');
    }
}

function handleAvatarEvent(event, data) {
    console.log(`[Demo] Avatar event: ${event}`, data || '');

    switch (event) {
        case 'avatar_start_talking':
            updateStatus('speaking', '說話中...');
            break;
        case 'avatar_stop_talking':
            updateStatus('ready', '已連線');
            break;
        case 'session_stopped':
            updateStatus('error', '會話已結束');
            startBtn.disabled = false;
            interruptBtn.disabled = true;
            stopBtn.disabled = true;
            avatarSession = null;
            break;
    }
}

// --- Text Input ---
async function sendText() {
    const text = textInput.value.trim();
    if (!text || !avatarSession) return;

    sendButton.disabled = true;

    try {
        avatarSession.speak(text);
        textInput.value = '';
        console.log('[Demo] Speak:', text);
    } catch (error) {
        console.error('[Demo] Speak failed:', error);
    } finally {
        sendButton.disabled = false;
    }
}

// --- STT (Microphone) ---
async function toggleRecording() {
    if (isRecording) {
        await stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    if (isRecording) return;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
        const resampleRatio = audioContext.sampleRate / 16000;

        sttSession = await client.startSTT({ language: 'zh-TW' });

        sttSession.onRecognizing((result) => {
            transcriptText.textContent = result.text + '...';
            textInput.value = result.text;
        });

        sttSession.onResult((result) => {
            transcriptText.textContent = result.text;
            textInput.value = result.text;
        });

        sttSession.onError((error) => {
            console.error('[Demo] STT error:', error);
        });

        processor.onaudioprocess = (e) => {
            if (sttSession && isRecording) {
                const input = e.inputBuffer.getChannelData(0);
                const resampled = resampleTo16kHz(input, resampleRatio);
                sttSession.sendAudio(convertToPCM16(resampled));
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        isRecording = true;
        micButton.textContent = '🛑';
        micButton.classList.add('recording');
        transcriptText.textContent = '正在聽取...';
    } catch (error) {
        console.error('[Demo] Start recording failed:', error);
        isRecording = false;
    }
}

async function stopRecording() {
    isRecording = false;

    if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
    }
    if (audioContext) {
        await audioContext.close();
        audioContext = null;
    }
    if (sttSession) {
        sttSession.stop();
        sttSession = null;
    }

    micButton.textContent = '🎤';
    micButton.classList.remove('recording');
}

// --- Audio Utilities ---
function resampleTo16kHz(input, ratio) {
    if (ratio <= 1) return input;
    const len = Math.floor(input.length / ratio);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        const idx = i * ratio;
        const floor = Math.floor(idx);
        const frac = idx - floor;
        out[i] =
            floor + 1 < input.length
                ? input[floor] * (1 - frac) + input[floor + 1] * frac
                : input[floor];
    }
    return out;
}

function convertToPCM16(input) {
    const buf = new ArrayBuffer(input.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buf;
}

// --- Status UI ---
function updateStatus(type, message) {
    statusBadge.className = `status-badge ${type}`;
    statusBadge.textContent = message;
}
