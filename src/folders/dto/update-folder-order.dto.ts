import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateFolderOrderDto {
  @ApiProperty({
    example: 1,
    description: 'The new order of the folder',
    default: 1,
  })
  @IsInt()
  @Min(1, { message: 'The order must be greater than or equal to 1' })
  order: number;
}
