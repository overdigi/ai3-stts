import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LiveavatarService } from './liveavatar.service';

@Controller('liveavatar')
export class LiveavatarController {
  constructor(private readonly liveavatarService: LiveavatarService) {}

  private validateApiKey(apiKey: string): void {
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      throw new BadRequestException('Invalid API Key');
    }
  }

  @Post('token')
  async createToken(
    @Headers('x-api-key') apiKey: string,
    @Body()
    body: {
      avatarId?: string;
      voiceId?: string;
      quality?: 'very_high' | 'high' | 'medium' | 'low';
      isSandbox?: boolean;
      language?: string;
      maxSessionDuration?: number;
      voiceSettings?: { speed?: number; stability?: number; style?: number };
    },
  ) {
    this.validateApiKey(apiKey);

    try {
      const avatarId = body.avatarId || process.env.AVATAR_ID;

      if (!avatarId) {
        throw new Error('缺少 avatarId 參數');
      }

      const result = await this.liveavatarService.createSessionToken({
        avatarId,
        voiceId: body.voiceId || process.env.VOICE_ID || undefined,
        quality: body.quality,
        isSandbox: body.isSandbox,
        language: body.language,
        maxSessionDuration: body.maxSessionDuration,
        voiceSettings: body.voiceSettings,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('config')
  async getConfig(@Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    const config = await this.liveavatarService.getConfig();
    return {
      success: true,
      config,
    };
  }
}
