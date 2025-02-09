import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { SharingAccessType } from '../entities/sharing.entity';

export class CreateSharingDto {
  @ApiProperty()
  @IsNotEmpty()
  //TODO: this should be an array of strings
  //or ids of users or another entity
  @IsEmail()
  sharedWith: string;

  @ApiProperty({
    example: 'read',
    description: 'The type of access to grant',
    default: 'read',
  })
  @IsNotEmpty()
  accessType: SharingAccessType;

  @ApiProperty({
    example: '2021-06-30T00:00:00Z',
    description: 'The time limit for the sharing',
    default: '2021-06-30T00:00:00Z',
  })
  @IsNotEmpty()
  timeLimit: Date;

  @ApiProperty({
    example: 'true',
    description: 'Whether to send an email notification',
    default: true,
  })
  @IsNotEmpty()
  sendEmail: boolean = true;

  @ApiProperty({
    example: 'true',
    description: 'Whether to use HTML in the email body',
    default: true,
  })
  @IsNotEmpty()
  useHtml: boolean = true;
}
