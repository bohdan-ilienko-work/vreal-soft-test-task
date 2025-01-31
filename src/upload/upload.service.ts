import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client = new S3Client({
    region: this.configService.getOrThrow<string>('AWS_S3_REGION'),
    credentials: {
      accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY'),
      secretAccessKey: this.configService.getOrThrow<string>(
        'AWS_SECRET_ACCESS_KEY',
      ),
    },
  });

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File) {
    return { message: 'hello world' };

    const { originalname, buffer } = file;
    const uploadParams = {
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: originalname,
      Body: buffer,
    };

    await this.s3Client.send(new PutObjectCommand(uploadParams));
    return { message: 'File uploaded successfully' };
  }
}
