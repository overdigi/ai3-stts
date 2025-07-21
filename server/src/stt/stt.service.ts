import { Injectable } from '@nestjs/common';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

@Injectable()
export class SttService {
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION || 'eastasia',
    );
    this.speechConfig.speechRecognitionLanguage = 'zh-TW';
  }

  createRecognizer(): sdk.SpeechRecognizer {
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    return new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
  }

  createRecognizerFromStream(audioStream: sdk.PushAudioInputStream): sdk.SpeechRecognizer {
    const audioConfig = sdk.AudioConfig.fromStreamInput(audioStream);
    return new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
  }

  async recognizeOnce(audioData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const pushStream = sdk.AudioInputStream.createPushStream();
      pushStream.write(audioData);
      pushStream.close();

      const recognizer = this.createRecognizerFromStream(pushStream);

      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            resolve(result.text);
          } else {
            reject(new Error(`Speech recognition failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          recognizer.close();
          reject(error);
        },
      );
    });
  }
}