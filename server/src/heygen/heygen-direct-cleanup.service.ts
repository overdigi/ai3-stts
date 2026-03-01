import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HeygenDirectService } from './heygen-direct.service';

@Injectable()
export class HeygenDirectCleanupService {
  private readonly logger = new Logger(HeygenDirectCleanupService.name);

  constructor(private readonly heygenDirectService: HeygenDirectService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredSessionsCleanup() {
    this.logger.debug('開始清理過期的 HeyGen 直接會話...');
    
    try {
      await this.heygenDirectService.cleanupExpiredSessions();
      this.logger.debug('過期會話清理完成');
    } catch (error) {
      this.logger.error('清理過期會話時發生錯誤:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHealthCheck() {
    this.logger.debug('HeyGen 直接模式健康檢查');
    // 這裡可以添加額外的健康檢查邏輯
  }
}