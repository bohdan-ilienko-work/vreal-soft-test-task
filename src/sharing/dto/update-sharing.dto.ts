import { PartialType } from '@nestjs/swagger';
import { CreateSharingDto } from './create-sharing.dto';

export class UpdateSharingDto extends PartialType(CreateSharingDto) {}
