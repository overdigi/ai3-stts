import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { HeygenStreamingService } from './heygen-streaming.service';

@Controller('heygen/streaming')
export class HeygenStreamingController {
  constructor(private readonly streamingService: HeygenStreamingService) {}

  @Get('token')
  async getAccessToken() {
    try {
      const token = await this.streamingService.getAccessToken();
      return {
        success: true,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('session')
  async createSession() {
    try {
      const session = await this.streamingService.createStreamingSession();
      return {
        success: true,
        ...session,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('session/:sessionId/start')
  async startSession(@Param('sessionId') sessionId: string) {
    try {
      const result = await this.streamingService.startStreaming(sessionId);
      return {
        success: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('session/:sessionId/speak')
  async speakText(
    @Param('sessionId') sessionId: string,
    @Body() body: { text: string },
  ) {
    try {
      const result = await this.streamingService.sendText(sessionId, body.text);
      return {
        success: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('session/:sessionId/stop')
  async stopSession(@Param('sessionId') sessionId: string) {
    try {
      const result = await this.streamingService.stopStreaming(sessionId);
      return {
        success: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    const session = this.streamingService.getSession(sessionId);
    return {
      success: !!session,
      session,
    };
  }
}