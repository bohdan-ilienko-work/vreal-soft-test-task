import { OmitType, PartialType } from '@nestjs/swagger';
import { UpdateFileDto } from './update-file.dto';

export class UpdateSharedFileDto extends OmitType(PartialType(UpdateFileDto), [
  'name',
] as const) {}
