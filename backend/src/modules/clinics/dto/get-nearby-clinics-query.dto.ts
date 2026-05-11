import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CLINIC_NEARBY_RADIUS_OPTIONS = [3000, 10000, 20000] as const;
export const CLINIC_SORT_TYPES = ['reputation', 'price'] as const;

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

function toTagIdArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }

  return [];
}

export class GetNearbyClinicsQueryDto {
  @ApiProperty({
    description: '纬度',
    example: 39.9075,
  })
  @Transform(({ value }) => toNumber(value))
  @IsLatitude()
  lat!: number;

  @ApiProperty({
    description: '经度',
    example: 116.4574,
  })
  @Transform(({ value }) => toNumber(value))
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({
    description: '半径（米）',
    enum: CLINIC_NEARBY_RADIUS_OPTIONS,
    default: 3000,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsIn(CLINIC_NEARBY_RADIUS_OPTIONS)
  radius: (typeof CLINIC_NEARBY_RADIUS_OPTIONS)[number] = 3000;

  @ApiPropertyOptional({
    description: '排序类型',
    enum: CLINIC_SORT_TYPES,
    default: 'reputation',
  })
  @IsOptional()
  @IsIn(CLINIC_SORT_TYPES)
  sortType: (typeof CLINIC_SORT_TYPES)[number] = 'reputation';

  @ApiPropertyOptional({
    description: '标签 ID 列表，逗号分隔',
    example: '1,2,3',
  })
  @IsOptional()
  @Transform(({ value }) => toTagIdArray(value))
  @IsArray()
  @ArrayMaxSize(20)
  tagIds?: number[];

  @ApiProperty({
    description: '城市名称',
    example: '北京',
  })
  @IsString()
  @MaxLength(20)
  city!: string;

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
