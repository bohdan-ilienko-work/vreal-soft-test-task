import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';
import { MailModule } from './mail/mail.module';
import { SharingModule } from './sharing/sharing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'prod' ? '.env' : '.env.dev',
      validationSchema: Joi.object({
        // AWS S3 validation
        AWS_ACCESS_KEY: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_S3_REGION: Joi.string().required(),
        AWS_S3_BUCKET_NAME: Joi.string().required(),

        // Throttler validation
        THROTTLE_TTL: Joi.number().required(),
        THROTTLE_LIMIT: Joi.number().required(),

        // Database connection validation
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),

        // Application port validation and API URL
        PORT: Joi.number().default(3000),
        API_URL: Joi.string().required(),

        // Google OAuth credentials validation
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),

        // JWT validation
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

        // SMTP validation
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        ssl: process.env.NODE_ENV === 'prod' ? true : false,
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    AuthModule,
    UsersModule,
    FilesModule,
    FoldersModule,
    MailModule,
    SharingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
