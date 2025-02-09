import { forwardRef, Module } from '@nestjs/common';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';
import { Sharing } from './entities/sharing.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoldersModule } from 'src/folders/folders.module';
import { MailModule } from 'src/mail/mail.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sharing]),
    forwardRef(() => FoldersModule),
    MailModule,
    UsersModule,
  ],
  controllers: [SharingController],
  providers: [SharingService],
  //TODO: check if SharingService should be exported
  exports: [SharingService],
})
export class SharingModule {}
