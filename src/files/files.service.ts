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
import { MailService } from 'src/mail/mail.service';
import { SendFileViaEmailDto } from './dto/send-file-via-email.dto';
import { MailOptions } from 'src/mail/dto/mail-options.dto';
import { AccessType } from 'src/core';
import { UpdateFileOrderDto } from './dto/update-file-order.dto';

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
    private readonly mailService: MailService,
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

    const filesCountInFolder = await this.fileRepository.count({
      where: { folder: { id: folderId } },
    });

    return this.fileRepository.save({
      id: fileId,
      name: originalname,
      user: { id: userId },
      folder: { id: folderId },
      order: filesCountInFolder + 1,
    });
  }

  async sendFileViaEmail(
    userId: string,
    sendFileViaEmailDto: SendFileViaEmailDto,
  ) {
    const { fileId, email: targetEmail, useHtml } = sendFileViaEmailDto;

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

    const { Body } = await this.s3Client.send(command);
    const buffer = Body as Buffer | undefined;

    const mailOptions: MailOptions = {
      to: targetEmail,
      subject: 'File sharing',
      text: useHtml
        ? undefined
        : `Here is the file you requested: ${file.name}`,
      html: useHtml
        ? `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333;">File Sharing</h2>
          <p style="color: #555;">Here is the file you requested: <strong>${file.name}</strong></p>
          <a href="#" style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">Download File</a>
          <p style="font-size: 12px; color: #999;">If you have any issues, contact support.</p>
        </div>
      `
        : undefined,
      attachments: [{ filename: file.name, content: buffer! }],
    };

    await this.mailService.sendMail(mailOptions);

    return {
      message: `File sent successfully as ${useHtml ? 'HTML' : 'text'} email`,
    };
  }

  async getSharedFile(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: {
        id: fileId,
        accessType: AccessType.PUBLIC,
        folder: { sharings: { sharedWith: { id: userId } } },
      },
    });

    if (!file) throw new NotFoundException('File not found');

    return {
      ...file,
      presignedUrl: await this.getPresignedUrl(fileId),
    };
  }

  async updateSharedFile(
    userId: string,
    fileId: string,
    updateSharedFileDto: UpdateFileDto,
  ) {
    const file = await this.fileRepository.findOne({
      where: {
        id: fileId,
        accessType: AccessType.PUBLIC,
        folder: { sharings: { sharedWith: { id: userId } } },
      },
    });

    if (!file) throw new NotFoundException('File not found');

    Object.assign(file, updateSharedFileDto);
    return this.fileRepository.save(file);
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

    const presignedUrl = await this.getPresignedUrl(fileId);

    return { ...file, presignedUrl };
  }

  async getPresignedUrl(fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${file.id}.${file.name.split('.').pop()}`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 60 });
  }

  async getPresignedUrls(fileIds: string[]) {
    const files = await this.fileRepository.find({
      where: fileIds.map((id) => ({ id })),
    });

    const commands = files.map(
      (file) =>
        new GetObjectCommand({
          Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
          Key: `${file.id}.${file.name.split('.').pop()}`,
        }),
    );

    const presignedUrls = await Promise.all(
      commands.map((command) =>
        getSignedUrl(this.s3Client, command, { expiresIn: 60 }),
      ),
    );

    return files.map((file, index) => ({
      fileId: file.id,
      presignedUrl: presignedUrls[index],
    }));
  }

  async updateFile(
    userId: string,
    fileId: string,
    updateFileDto: UpdateFileDto,
  ) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, folder: { user: { id: userId } } },
    });
    if (!file) throw new NotFoundException('File not found');

    if (updateFileDto.folderId) {
      const folder = await this.foldersService.findById(updateFileDto.folderId);
      if (!folder || folder.user.id !== userId) {
        throw new NotFoundException(
          'Target folder not found or forbidden access',
        );
      }
      file.folder = folder;
    }

    Object.assign(file, updateFileDto);
    return this.fileRepository.save(file);
  }

  async copyFilesInFolder(
    userId: string,
    folderId: string,
    newFolderId: string,
  ) {
    const files: File[] = await this.fileRepository.find({
      where: { folder: { id: folderId, user: { id: userId } } },
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

  getFileStream(fileId: string, fileName: string) {
    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
      Key: `${fileId}.${fileName.split('.').pop()}`,
    });

    return this.s3Client
      .send(command)
      .then(({ Body }) => Body as Buffer | undefined);
  }

  async changeFileOrder(
    userId: string,
    fileId: string,
    updateFileOrderDto: UpdateFileOrderDto,
  ): Promise<File & { message: string }> {
    const { order: newOrder } = updateFileOrderDto;

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['folder', 'folder.user'],
    });

    if (!file || file.folder.user.id !== userId) {
      throw new NotFoundException('File not found');
    }

    const fileToSwap = await this.fileRepository.findOne({
      where: { folder: { id: file.folder.id }, order: newOrder },
    });

    if (!fileToSwap) {
      throw new NotFoundException('File to swap not found');
    }

    [file.order, fileToSwap.order] = [fileToSwap.order, file.order];

    await this.fileRepository.save([file, fileToSwap]);

    return {
      ...file,
      message: `File ${file.name} order has been changed to ${newOrder}`,
    };
  }
}
