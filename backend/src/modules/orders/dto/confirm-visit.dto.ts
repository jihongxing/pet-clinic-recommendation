import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ConfirmVisitDto {
  @ApiProperty({
    description: '是否已实际到诊所就诊',
    example: true,
  })
  @IsBoolean()
  visited!: boolean;
}
