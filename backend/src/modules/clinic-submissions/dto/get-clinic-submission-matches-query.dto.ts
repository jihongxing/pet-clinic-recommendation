import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ToNumber } from './shared.dto';

export class GetClinicSubmissionMatchesQueryDto {
  @ApiProperty({
    description: '诊所名称',
    example: '爱宠动物医院',
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: '诊所地址',
    example: '北京市朝阳区xx路xx号',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: '城市',
    example: '北京',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  city?: string;

  @ApiPropertyOptional({
    description: '区域',
    example: '朝阳区',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  district?: string;

  @ApiPropertyOptional({
    description: '联系电话',
    example: '010-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: '纬度',
    example: 39.9075,
  })
  @IsOptional()
  @ToNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    description: '经度',
    example: 116.4574,
  })
  @IsOptional()
  @ToNumber()
  @IsLongitude()
  lng?: number;
}
