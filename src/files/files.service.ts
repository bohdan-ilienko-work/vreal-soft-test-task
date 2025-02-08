import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { FoldersService } from 'src/folders/folders.service';
import { v4 as uuid } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UpdateFileDto } from './dto/update-file.dto';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client = new S3Client({
    region: this.configService.getOrThrow<string>('AWS_S3_REGION'),
    credentials: {
      accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY'),
      secretAccessKey: this.configService.getOrThrow<string>(
        'AWS_SECRET_ACCESS_KEY',
      ),
    },
  });
  constructor(
    // Inject the FileRepository
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,

    @Inject(forwardRef(() => FoldersService))
    private readonly foldersService: FoldersService,
  ) {}

  async uploadFile(
    userId: string,
    folderId: string,
    file: Express.Multer.File,
  ) {
    const { originalname, buffer } = file;
    const fileExtension = originalname.split('.').pop();
    const fileId = uuid();
    const uploadParams = {
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${fileId}.${fileExtension}`,
      Body: buffer,
    };
    await this.s3Client.send(new PutObjectCommand(uploadParams));
    return this.fileRepository.save({
      id: fileId,
      name: originalname,
      user: { id: userId },
      folder: { id: folderId },
    });
  }

  async getFiles(userId: string, folderId: string) {
    const files = await this.fileRepository.find({
      where: { folder: { id: folderId, user: { id: userId } } },
    });

    const filesWithPresignedUrl = await Promise.all(
      files.map(async (file) => {
        const command = new GetObjectCommand({
          Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
          Key: `${file.id}.${file.name.split('.').pop()}`,
        });

        const presignedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 60,
        });

        return { ...file, presignedUrl };
      }),
    );

    return filesWithPresignedUrl;
  }

  async getFile(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, folder: { user: { id: userId } } },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${file.id}.${file.name.split('.').pop()}`,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 60,
    });

    return { ...file, presignedUrl };
  }

  async updateFile(
    userId: string,
    fileId: string,
    updateFileDto: UpdateFileDto,
  ) {
    const { name, folderId } = updateFileDto;

    const file = await this.fileRepository.findOne({
      where: { id: fileId, folder: { user: { id: userId } } },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (folderId) {
      const folder = await this.foldersService.findById(folderId);

      if (!folder || folder.user.id !== userId) {
        throw new NotFoundException(
          'Target folder not found or forbidden access',
        );
      }

      file.folder = folder;
    }

    if (name) {
      file.name = name;
    }

    return this.fileRepository.save(file);
  }

  async copyFilesInFolder(
    userId: string,
    folderId: string,
    newFolderId: string,
  ) {
    const files: File[] = await this.fileRepository.find({
      where: { folder: { id: folderId } },
    });
    const clonedFiles: File[] = files.map((file: File) =>
      this.fileRepository.create({
        name: file.name,
        folder: { id: newFolderId },
        accessType: file.accessType,
      }),
    );

    const filesToCopy = files.map((file) => ({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${file.id}.${file.name.split('.').pop()}`,
    }));

    const copyPromises = filesToCopy.map((file) =>
      this.s3Client.send(new GetObjectCommand(file)),
    );

    await Promise.all(copyPromises);

    await this.fileRepository.save(clonedFiles);
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, folder: { user: { id: userId } } },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const deleteParams = {
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${file.id}.${file.name.split('.').pop()}`,
    };

    await this.s3Client.send(new GetObjectCommand(deleteParams));

    return this.fileRepository.remove(file);
  }
}
