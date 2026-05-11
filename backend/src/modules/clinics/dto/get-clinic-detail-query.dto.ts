import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class GetClinicDetailQueryDto {
  @ApiPropertyOptional({
    description: '纬度，用于计算与诊所的距离',
    example: 39.9075,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    description: '经度，用于计算与诊所的距离',
    example: 116.4574,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsLongitude()
  lng?: number;
}
