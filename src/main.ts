import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const options = new DocumentBuilder()
    .setTitle('Test task for VReal Soft')
    .setDescription('The test task for VReal Soft')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'Bearer',
      description: 'Enter access token here',
      bearerFormat: 'Bearer ${token}',
      in: 'header',
      name: 'Authorization',
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  const configService = app.get(ConfigService);
  const PORT = configService.getOrThrow<number>('PORT') || 3000;
  const API_URL = configService.getOrThrow<string>('API_URL');

  await app.listen(PORT);

  Logger.log(`🚀 Server running on ${API_URL}/api`, 'Bootstrap');
  Logger.log(`📚 Swagger running on ${API_URL}/docs`, 'Bootstrap');
}

bootstrap();
