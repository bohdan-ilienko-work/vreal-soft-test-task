import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum CloneFolderType {
  SIMPLE = 'SIMPLE',
  WITH_FOLDER_STRUCTURE = 'WITH_FOLDER_STRUCTURE',
  WITH_FOLDER_STRUCTURE_AND_FILES = 'WITH_FOLDER_STRUCTURE_AND_FILES',
}

export class CloneFolderConfigDto {
  @ApiProperty({
    description: 'Type of cloning folder',
    enum: CloneFolderType,
    example: CloneFolderType.SIMPLE,
    default: CloneFolderType.SIMPLE,
  })
  @IsEnum(CloneFolderType)
  copyType: CloneFolderType;
}
