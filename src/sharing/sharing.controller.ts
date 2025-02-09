import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { SharingService } from './sharing.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { CreateSharingDto } from './dto/create-sharing.dto';

@Controller('sharing')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post(':folderId/folder')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  createFolderSharing(
    @Param('folderId') folderId: string,
    @UserId() userId: string,
    @Body() createSharingDto: CreateSharingDto,
  ) {
    return this.sharingService.createFolderSharing(
      userId,
      folderId,
      createSharingDto,
    );
  }
}
