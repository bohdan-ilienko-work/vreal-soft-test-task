import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({
    description: 'Name of the folder to be created',
    example: 'Documents',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description:
      'Parent folder ID. If not provided, the folder will be created in the root.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
