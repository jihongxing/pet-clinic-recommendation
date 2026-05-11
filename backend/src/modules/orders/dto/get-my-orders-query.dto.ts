import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Max, Min } from 'class-validator';

import { OrderStatus } from '../../../database/entities';

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class GetMyOrdersQueryDto {
  @ApiPropertyOptional({
    description: '预约状态筛选',
    enum: OrderStatus,
    example: OrderStatus.Clicked,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

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
