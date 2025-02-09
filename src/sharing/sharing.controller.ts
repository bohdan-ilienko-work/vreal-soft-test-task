import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SharingService } from './sharing.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { CreateSharingDto } from './dto/create-sharing.dto';
import { UpdateSharingDto } from './dto/update-sharing.dto';

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

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  getSharedByUser(@UserId() userId: string) {
    return this.sharingService.getSharedByUser(userId);
  }

  @Get('received')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  getSharedWithUser(@UserId() userId: string) {
    return this.sharingService.getSharedWithUser(userId);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  updateSharing(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() updateSharingDto: UpdateSharingDto,
  ) {
    return this.sharingService.updateSharing(userId, id, updateSharingDto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  deleteSharing(@Param('id') id: string, @UserId() userId: string) {
    return this.sharingService.deleteSharing(userId, id);
  }
}
