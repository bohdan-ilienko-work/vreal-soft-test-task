import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FoldersService } from 'src/folders/folders.service';
import { Sharing } from './entities/sharing.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mail.service';
import { CreateSharingDto } from './dto/create-sharing.dto';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { UpdateSharingDto } from './dto/update-sharing.dto';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(Sharing)
    private readonly sharingRepository: Repository<Sharing>,
    @Inject(forwardRef(() => FoldersService))
    private readonly foldersService: FoldersService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async createFolderSharing(
    userId: string,
    folderId: string,
    createSharingDto: CreateSharingDto,
  ) {
    const { sharedWith, accessType, timeLimit, sendEmail, useHtml } =
      createSharingDto;
    const sharedWithUser = await this.usersService.findByEmail(sharedWith);
    const folder = await this.foldersService.getFolderRaw(userId, folderId);

    await this.sharingRepository.upsert(
      {
        sharedBy: { id: userId },
        folder,
        sharedWith: { id: sharedWithUser.id },
        accessType,
        timeLimit,
      },
      ['sharedBy', 'folder', 'sharedWith'],
    );

    if (sendEmail) {
      const url = `${this.configService.getOrThrow<string>('API_URL')}/folders/${folderId}/shared`;

      const mailOptions = {
        to: sharedWith,
        subject: 'Folder shared with you',
        text: useHtml
          ? undefined
          : `Folder ${folder.name} has been shared with you. Click ${url} to access it.`,
        html: useHtml
          ? `<div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333;">Folder Sharing</h2>
            <p style="color: #555;">Folder <strong>${folder.name}</strong> has been shared with you.</p>
            <p style="color: #555;">Click <a href="${url}" style="color: #007bff; text-decoration: none;">here</a> to access it.</p>
          </div>`
          : undefined,
      };

      await this.mailService.sendMail(mailOptions);
    }

    return {
      message: `Folder ${folder.name} has been shared with ${sharedWith} ${
        sendEmail ? 'and an email has been sent.' : ''
      }`,
    };
  }

  async getSharedByUser(userId: string) {
    return this.sharingRepository.find({
      where: { sharedBy: { id: userId } },
      relations: ['folder', 'sharedBy', 'sharedWith'],
    });
  }

  async getSharedWithUser(userId: string) {
    return this.sharingRepository.find({
      where: { sharedWith: { id: userId } },
      relations: ['folder', 'sharedBy', 'sharedWith'],
    });
  }

  async getSharingForUserToFolder(userId: string, folderId: string) {
    const sharing = await this.sharingRepository.findOne({
      where: {
        folder: { id: folderId },
        sharedWith: { id: userId },
      },
      relations: ['folder', 'sharedBy', 'sharedWith'],
    });

    if (!sharing) {
      throw new NotFoundException('Sharing not found');
    }

    return sharing;
  }

  async updateSharing(
    userId: string,
    sharingId: string,
    updateSharingDto: UpdateSharingDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sharedWith, useHtml, ...updateSharingData } = updateSharingDto;
    const sharing = await this.sharingRepository.findOne({
      where: { id: sharingId, sharedWith: { id: userId } },
    });

    if (!sharing) {
      throw new NotFoundException('Sharing not found');
    }

    await this.sharingRepository.update(sharingId, updateSharingData);

    return {
      message: 'Sharing updated successfully',
    };
  }

  async deleteSharing(userId: string, sharingId: string) {
    const sharing = await this.sharingRepository.findOne({
      where: { id: sharingId, sharedBy: { id: userId } },
    });

    if (!sharing) {
      throw new NotFoundException('Sharing not found');
    }

    await this.sharingRepository.delete(sharingId);

    return {
      message: 'Sharing deleted successfully',
    };
  }
}
