import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // 提供靜態文件服務（ai3-demo 目錄）
  const demoPath = join(__dirname, '..', '..', 'ai3-demo');
  app.useStaticAssets(demoPath, { prefix: '/demo' });
  console.log(`Serving static files from: ${demoPath} at /demo`);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`AI3-STTS Server is running on port ${port}`);
  console.log(`Demo page available at: http://localhost:${port}/demo/test.html`);
}
bootstrap();