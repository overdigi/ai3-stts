import { Controller, Post, Get, Body, Param, Headers, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { HeygenService, SpeakRequest } from './heygen.service';

@Controller('heygen')
export class HeygenController {
  constructor(private readonly heygenService: HeygenService) {}

  @Post('streaming/session')
  async createStreamingSession(@Body() body: { avatarId: string }) {
    if (!body.avatarId) {
      throw new BadRequestException('avatarId is required');
    }

    try {
      const result = await this.heygenService.createStreamingSession(body.avatarId);
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('streaming/session/:sessionId/speak')
  async sendStreamingTask(
    @Param('sessionId') sessionId: string,
    @Body() body: { text: string; taskType?: 'talk' | 'repeat' },
  ) {
    if (!body.text) {
      throw new BadRequestException('text is required');
    }

    const success = await this.heygenService.sendStreamingTask(
      sessionId,
      body.text,
      body.taskType || 'repeat',
    );
    return { success };
  }

  @Post('streaming/session/:sessionId/stop')
  async stopStreamingSession(@Param('sessionId') sessionId: string) {
    const success = await this.heygenService.stopStreamingSession(sessionId);
    return { success };
  }

  @Post('streaming/session/:sessionId/answer')
  async sendWebRTCAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { answer: any },
  ) {
    if (!body.answer) {
      throw new BadRequestException('answer is required');
    }

    const success = await this.heygenService.sendWebRTCAnswer(sessionId, body.answer);
    return { success };
  }

  @Post('streaming/session/:sessionId/ice')
  async sendICECandidate(
    @Param('sessionId') sessionId: string,
    @Body() body: { candidate: any },
  ) {
    if (!body.candidate) {
      throw new BadRequestException('candidate is required');
    }

    const success = await this.heygenService.sendICECandidate(sessionId, body.candidate);
    return { success };
  }

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
  async getIframe(
    @Param('avatarId') avatarId: string,
    @Res() res: Response,
  ) {
    const html = await this.heygenService.generateStreamingIframeHtml(avatarId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('/api/heygen/access-token')
  async getAccessToken() {
    try {
      const token = await this.heygenService.getAccessToken();
      return token;
    } catch (error) {
      throw new BadRequestException('Failed to get access token');
    }
  }

  @Get('test')
  async testHeyGenAPI() {
    try {
      // 測試 access token
      const token = await this.heygenService.getAccessToken();
      
      // 測試創建 session
      const session = await this.heygenService.createStreamingSession(
        process.env.AVATAR_ID || 'bc13dd17488a44ffa46f0ccb26ba613a'
      );
      
      return {
        success: true,
        tokenLength: token?.length || 0,
        sessionId: session.sessionId,
        hasUrl: !!session.url,
        hasSdp: !!session.sdp,
        hasIceServers: session.iceServers?.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        apiKey: this.heygenService['apiKey'] ? 'Set' : 'Not set',
      };
    }
  }
}