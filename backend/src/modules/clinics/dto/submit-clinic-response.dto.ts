import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class SubmitClinicResponseDto {
  @ApiProperty({
    description: '标签 ID',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tagId!: number;

  @ApiProperty({
    description: '回应内容，最多 200 字',
    example: '我们所有收费项目均在前台公示，如有疑问可联系客服核实。',
  })
  @IsString()
  @IsNotEmpty()
  responseText!: string;
}
