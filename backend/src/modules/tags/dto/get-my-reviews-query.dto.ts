import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class GetMyReviewsQueryDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 20,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
