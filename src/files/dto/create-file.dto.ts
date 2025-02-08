import { ApiProperty } from '@nestjs/swagger';

export class CreateFileDto {
  @ApiProperty({
    description: 'The file to be uploaded',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Parent folder ID where the file will be uploaded',
    type: 'string',
    nullable: false,
  })
  folderId: string;
}
