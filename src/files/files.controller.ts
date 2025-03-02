import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { SendFileViaEmailDto } from './dto/send-file-via-email.dto';
import { UpdateSharedFileDto } from './dto/update-shared-file.dto';
import { UpdateFileOrderDto } from './dto/update-file-order.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateFileDto })
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UserId() userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 }),
          //   new FileTypeValidator({ fileType: /\/(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() createFileDto: CreateFileDto,
  ) {
    return this.filesService.uploadFile(userId, createFileDto.folderId, file);
  }

  @Post(':fileId/:email/send-via-email')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  sendFileViaEmail(
    @UserId() userId: string,
    @Param() sendFileViaEmailDto: SendFileViaEmailDto,
  ) {
    return this.filesService.sendFileViaEmail(userId, sendFileViaEmailDto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  getFiles(@UserId() userId: string, @Query('folderId') folderId: string) {
    return this.filesService.getFiles(userId, folderId);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  getFile(@UserId() userId: string, @Param('id') id: string) {
    return this.filesService.getFile(userId, id);
  }

  @Get(':id/shared')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  getSharedFile(@UserId() userId: string, @Param('id') id: string) {
    return this.filesService.getSharedFile(userId, id);
  }

  @Patch(':id/shared')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  updateSharedFile(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() updateSharedFileDto: UpdateSharedFileDto,
  ) {
    return this.filesService.updateSharedFile(userId, id, updateSharedFileDto);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  updateFile(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
  ) {
    return this.filesService.updateFile(userId, id, updateFileDto);
  }

  @Patch(':id/change-order')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  changeFileOrder(
    @UserId() userId: string,
    @Param('id') id: string,
    @Query('newOrder') updateOrderFileDto: UpdateFileOrderDto,
  ) {
    return this.filesService.changeFileOrder(userId, id, updateOrderFileDto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  deleteFile(@UserId() userId: string, @Param('id') id: string) {
    return this.filesService.deleteFile(userId, id);
  }
}
