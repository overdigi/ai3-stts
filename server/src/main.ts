import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`AI3-STTS Server is running on port ${port}`);
}
bootstrap();