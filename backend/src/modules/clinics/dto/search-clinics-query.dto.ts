import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class SearchClinicsQueryDto {
  @ApiProperty({
    description: '搜索关键词，匹配诊所名称或地址',
    example: '爱宠',
  })
  @IsString()
  @MaxLength(100)
  keyword!: string;

  @ApiPropertyOptional({
    description: '城市名称',
    example: '北京',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  city?: string;

  @ApiPropertyOptional({
    description: '纬度，用于计算距离',
    example: 39.9075,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    description: '经度，用于计算距离',
    example: 116.4574,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页数量，最大 50',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
