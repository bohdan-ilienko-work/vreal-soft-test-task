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
import { FoldersService } from './folders.service';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { CreateFolderDto } from './dto/create-folder.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CloneFolderConfigDto } from './dto/clone-folder-config.dto';
import { SendArchiveViaEmailDto } from './dto/send-archive-via-email.dto';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createFolder(
    @UserId() userId: string,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.createFolder(userId, createFolderDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getFoldersTree(@UserId() userId: string) {
    return this.foldersService.getFoldersTree(userId);
  }

  @Get('raw')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getFoldersRaw(@UserId() userId: string) {
    return this.foldersService.getFoldersRaw(userId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getFolder(@UserId() userId: string, @Param('id') id: string) {
    return this.foldersService.getFolder(userId, id);
  }

  @Get(':id/shared')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getSharedFolder(@UserId() userId: string, @Param('id') id: string) {
    return this.foldersService.getSharedFolder(userId, id);
  }

  @Patch(':id/shared')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateSharedFolder(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.updateSharedFolder(userId, id, createFolderDto);
  }

  @Get(':id/raw')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getFolderRaw(@UserId() userId: string, @Param('id') id: string) {
    return this.foldersService.getFolderRaw(userId, id);
  }

  @Post(':id/clone-folder')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  cloneFolder(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() cloneFolderConfigDto: CloneFolderConfigDto,
  ) {
    return this.foldersService.cloneFolder(
      userId,
      id,
      cloneFolderConfigDto.copyType,
    );
  }

  @Post(':folderId/send-archive-via-email')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  sendArchiveViaEmail(
    @UserId() userId: string,
    @Param('folderId') folderId: string,
    @Body() sendArchiveViaEmailDto: SendArchiveViaEmailDto,
  ) {
    return this.foldersService.sendArchiveViaEmail(
      userId,
      folderId,
      sendArchiveViaEmailDto,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateFolder(
    @UserId() userId: string,
    @Body() createFolderDto: CreateFolderDto,
    @Param('id') id: string,
  ) {
    return this.foldersService.updateFolder(userId, id, createFolderDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  deleteFolder(@UserId() userId: string, @Param('id') id: string) {
    return this.foldersService.deleteFolder(userId, id);
  }
}
