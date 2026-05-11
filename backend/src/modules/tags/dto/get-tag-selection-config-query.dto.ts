import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { EmotionType } from '../../../database/entities';

export class GetTagSelectionConfigQueryDto {
  @ApiProperty({
    description: '情绪类型',
    enum: EmotionType,
    example: EmotionType.Satisfied,
  })
  @IsEnum(EmotionType)
  emotion!: EmotionType;
}
