import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFolderDto } from './create-folder.dto';

export class UpdateSharedFolderDto extends OmitType(
  PartialType(CreateFolderDto),
  ['parentId'] as const,
) {}
