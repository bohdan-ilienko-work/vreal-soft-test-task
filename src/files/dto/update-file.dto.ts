import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateFileDto {
  @ApiProperty({
    description: 'Name of the file',
    type: 'string',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Parent folder ID where the file will be moved',
    type: 'string',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  folderId?: string;
}
