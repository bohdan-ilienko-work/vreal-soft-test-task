import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccessType } from 'src/core';

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

  @ApiProperty({
    description: 'The type of access to grant',
    enum: AccessType,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(AccessType)
  accessType?: AccessType;
}
