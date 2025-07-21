import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { SttService } from './stt.service';

@Controller('stt')
export class SttController {
  constructor(private readonly sttService: SttService) {}

  @Post('recognize')
  async recognizeAudio(
    @Body() body: { audio: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    // 驗證 API Key
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      throw new BadRequestException('Invalid API Key');
    }

    if (!body.audio) {
      throw new BadRequestException('Audio data is required');
    }

    try {
      // 假設音訊資料是 base64 編碼
      const audioBuffer = Buffer.from(body.audio, 'base64');
      const text = await this.sttService.recognizeOnce(audioBuffer);
      
      return {
        success: true,
        text,
        confidence: 1,
        language: 'zh-TW',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}