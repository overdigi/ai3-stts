import { Controller, Post, Get, Body, Param, Headers, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { HeygenService, SpeakRequest } from './heygen.service';

@Controller('heygen')
export class HeygenController {
  constructor(private readonly heygenService: HeygenService) {}

  @Post('speak')
  async speakText(
    @Body() body: SpeakRequest,
    @Headers('x-api-key') apiKey: string,
  ) {
    // 暫時禁用 API Key 驗證用於測試
    // if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    //   throw new BadRequestException('Invalid API Key');
    // }

    if (!body.text || !body.avatarId) {
      throw new BadRequestException('Text and avatarId are required');
    }

    // 如果沒有提供 voiceId，使用該角色的預設語音
    if (!body.voiceId) {
      const avatar = this.heygenService.getAvatarConfig(body.avatarId);
      if (avatar) {
        body.voiceId = avatar.defaultVoiceId;
      }
    }

    try {
      const result = await this.heygenService.speakText(body);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('config')
  getConfig(@Headers('x-api-key') apiKey: string) {
    // 暫時禁用 API Key 驗證用於測試
    // if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    //   throw new BadRequestException('Invalid API Key');
    // }

    const avatars = this.heygenService.getAvatarConfigs();
    return { avatars };
  }

  @Get('iframe/:avatarId')
  getIframe(
    @Param('avatarId') avatarId: string,
    @Res() res: Response,
  ) {
    const html = this.heygenService.generateIframeHtml(avatarId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}