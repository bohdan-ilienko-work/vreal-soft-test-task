import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export type ArchiveType = 'zip' | 'tar' | 'tar.gz';

export class SendArchiveViaEmailDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address to send the archive to',
    default: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'zip',
    description: 'The type of archive to create',
    default: 'zip',
  })
  @IsNotEmpty()
  @IsIn(['zip', 'tar', 'tar.gz'])
  archiveType: ArchiveType;

  @ApiProperty({
    example: 'true',
    description: 'Whether to use HTML in the email body',
    default: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  useHtml: boolean = true;
}
