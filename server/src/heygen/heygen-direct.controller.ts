import { Controller, Post, Get, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { HeygenDirectService } from './heygen-direct.service';

@Controller('heygen-direct')
export class HeygenDirectController {
  constructor(private readonly heygenDirectService: HeygenDirectService) {}

  @Post('session')
  async createSession(
    @Body() createSessionDto: {
      avatarId?: string;
      voiceId?: string;
    },
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      // 使用環境變數的預設值如果前端沒有提供
      const avatarId = createSessionDto.avatarId || process.env.AVATAR_ID;
      const voiceId = createSessionDto.voiceId || process.env.VOICE_ID;
      
      if (!avatarId) {
        throw new Error('缺少 avatarId 參數');
      }
      
      const sessionInfo = await this.heygenDirectService.createSession({
        avatarId,
        voiceId,
        token: apiKey || 'default', // 簡化授權處理
      });

      return {
        success: true,
        sessionId: sessionInfo.sessionId,
        livekitUrl: sessionInfo.livekitUrl,
        livekitToken: sessionInfo.livekitToken,
        livekitIceServers: sessionInfo.livekitIceServers,
        realtimeEndpoint: (sessionInfo as any).realtimeEndpoint,
        message: 'HeyGen 直接會話已建立',
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

  @Post('session/:sessionId/speak')
  async speak(
    @Param('sessionId') sessionId: string,
    @Body() speakDto: { text: string },
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      const token = apiKey || 'default';
      
      await this.heygenDirectService.speak(sessionId, speakDto.text, token);

      return {
        success: true,
        message: '語音合成請求已發送',
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

  @Post('session/:sessionId/stop')
  async stopSession(
    @Param('sessionId') sessionId: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      const token = apiKey || 'default';
      
      await this.heygenDirectService.stopSession(sessionId, token);

      return {
        success: true,
        message: '會話已停止',
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

  @Get('session/:sessionId')
  async getSessionStatus(
    @Param('sessionId') sessionId: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      const token = apiKey || 'default';
      
      const status = await this.heygenDirectService.getSessionStatus(sessionId, token);

      return {
        success: true,
        sessionId,
        ...status,
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

  @Get('sessions')
  async getAllSessions(@Headers('x-api-key') apiKey?: string) {
    try {
      const token = apiKey || 'default';
      
      const sessions = await this.heygenDirectService.getAllSessions(token);

      return {
        success: true,
        sessions,
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

  @Post('/v1/streaming.create_token')
  async createToken(
    @Body() createTokenDto: { avatarId?: string },
  ) {
    try {
      const avatarId = createTokenDto.avatarId;
      
      if (!avatarId) {
        throw new Error('Avatar ID is required');
      }

      const token = await this.heygenDirectService.createStreamingToken(avatarId);

      return token;
    } catch (error) {
      throw new HttpException(
        {
          error: error instanceof Error ? error.message : 'Failed to retrieve access token',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}