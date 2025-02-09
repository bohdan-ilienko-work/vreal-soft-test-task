import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class SendFileViaEmailDto {
  @ApiProperty({
    example: 'john.doe@gmail.com',
    description: 'The email address to send the file to',
    default: 'john.doe@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'b1f1c6d5-4b6d-4f3e-9c5b-1c2b7c4d6e7f',
    description: 'The ID of the file to send via email',
    default: 'b1f1c6d5-4b6d-4f3e-9c5b-1c2b7c4d6e7f',
  })
  @IsUUID()
  @IsNotEmpty()
  fileId: string;

  @ApiProperty({
    example: 'true',
    description: 'Whether to use HTML in the email body',
    default: 'true',
  })
  @IsNotEmpty()
  @IsBoolean()
  useHtml: boolean = true;
}
