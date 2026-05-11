import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { TagLayer } from '../../../database/entities';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return value;
}

export class GetTagsQueryDto {
  @ApiPropertyOptional({
    description: '标签层级',
    enum: TagLayer,
    example: TagLayer.L1,
  })
  @IsOptional()
  @IsEnum(TagLayer)
  layer?: TagLayer;

  @ApiPropertyOptional({
    description: '是否仅返回用户可选标签',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  userSelectable?: boolean;
}
