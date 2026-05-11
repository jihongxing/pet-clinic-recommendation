import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { EmotionType, ReviewSource } from '../../../database/entities';

export class SubmitTagDto {
  @ApiProperty({
    description: '诊所 ID',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clinicId!: number;

  @ApiProperty({
    description: '情绪类型',
    enum: EmotionType,
    example: EmotionType.Satisfied,
  })
  @IsEnum(EmotionType)
  emotion!: EmotionType;

  @ApiProperty({
    description: '主标签 ID 列表，最多 3 个',
    example: [1, 5, 9],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(3)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  tagIds!: number[];

  @ApiPropertyOptional({
    description: '补充标签 ID 列表，最多 2 个',
    example: [30],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  extraTagIds?: number[];

  @ApiPropertyOptional({
    description: '评价来源，默认 normal',
    enum: ReviewSource,
    example: ReviewSource.Order,
  })
  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;

  @ApiPropertyOptional({
    description: '可选文字说明，仅做留存展示，不参与排序，最多 500 字',
    example: '医生解释得很细，后续护理建议也比较明确。',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewText?: string;
}
