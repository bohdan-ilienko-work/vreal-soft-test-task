import { Module, forwardRef } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { Folder } from './entities/folder.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { MailModule } from 'src/mail/mail.module';
import { SharingModule } from 'src/sharing/sharing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Folder]),
    forwardRef(() => FilesModule),
    forwardRef(() => SharingModule),
    MailModule,
  ],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
