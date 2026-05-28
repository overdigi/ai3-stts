import { Injectable, Logger } from '@nestjs/common';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { PhonemeService } from './phoneme.service';

export interface AzureTtsOptions {
  text: string;
  voiceName: string;
}

/**
 * Azure Speech TTS service for LiveAvatar Lite Mode.
 *
 * Produces RAW (header-less) 24kHz, 16-bit, mono PCM — matching the
 * ElevenLabs `pcm_24000` format previously consumed by LiveAvatar's
 * `repeatAudio` / `sendCommandEvent({ event_type: 'avatar.speak_audio' })`.
 */
@Injectable()
export class AzureTtsService {
  private readonly logger = new Logger(AzureTtsService.name);
  private readonly speechKey: string;
  private readonly speechRegion: string;

  constructor(private readonly phonemeService: PhonemeService) {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey) {
      throw new Error('AZURE_SPEECH_KEY 環境變數未設定');
    }
    if (!speechRegion) {
      throw new Error('AZURE_SPEECH_REGION 環境變數未設定');
    }

    this.speechKey = speechKey;
    this.speechRegion = speechRegion;
  }

  /**
   * Synthesize speech to raw PCM (24kHz, 16-bit, mono, little-endian, no header).
   * Automatically applies phoneme fixes from config/phoneme-fixes.json when needed.
   */
  async synthesizePcm(options: AzureTtsOptions): Promise<Buffer> {
    const { text, voiceName } = options;

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.speechKey,
      this.speechRegion,
    );
    speechConfig.speechSynthesisVoiceName = voiceName;
    // RAW 24kHz 16-bit mono PCM — matches ElevenLabs `pcm_24000` exactly
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

    try {
      const ssmlContent = this.phonemeService.applyFixes(text);
      const useSsml = ssmlContent !== null;

      this.logger.log(
        `Azure TTS: voiceName=${voiceName}, textLen=${text.length}, ssml=${useSsml}`,
      );

      const audioData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const onResult = (result: sdk.SpeechSynthesisResult) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(result.audioData);
          } else {
            const reason = sdk.ResultReason[result.reason];
            const details = result.errorDetails || 'unknown error';
            reject(new Error(`Azure TTS 合成失敗 [${reason}]: ${details}`));
          }
        };
        const onError = (err: string) => reject(new Error(`Azure TTS 錯誤: ${err}`));

        if (useSsml) {
          const ssml = this.phonemeService.buildSsml(ssmlContent, voiceName);
          this.logger.debug(`SSML: ${ssml}`);
          synthesizer.speakSsmlAsync(ssml, onResult, onError);
        } else {
          synthesizer.speakTextAsync(text, onResult, onError);
        }
      });

      return Buffer.from(audioData);
    } finally {
      synthesizer.close();
    }
  }
}
