import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { ClinicSubmissionType } from '../../../database/entities';
import { ClinicSubmissionCapabilityFieldsDto } from './capability-fields.dto';
import { ToNumber, ToStringArray } from './shared.dto';

const CLINIC_SUBMISSION_TYPE_OPTIONS = [
  ClinicSubmissionType.New,
  ClinicSubmissionType.Supplement,
  ClinicSubmissionType.Correction,
] as const;

export class CreateClinicSubmissionDto extends ClinicSubmissionCapabilityFieldsDto {
  @ApiProperty({
    description: '推荐类型：新诊所 / 补充信息 / 纠错',
    enum: CLINIC_SUBMISSION_TYPE_OPTIONS,
    example: ClinicSubmissionType.New,
  })
  @IsIn(CLINIC_SUBMISSION_TYPE_OPTIONS)
  submissionType!: ClinicSubmissionType;

  @ApiPropertyOptional({
    description: '已有诊所 ID，补充或纠错时可传',
    example: 12,
  })
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  clinicId?: number;

  @ApiProperty({
    description: '诊所名称',
    example: '爱宠动物医院',
  })
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({
    description: '联系电话',
    example: '010-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: '营业时间',
    example: '09:00-21:00',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessHours?: string;

  @ApiPropertyOptional({
    description: '图片 URL 列表',
    type: [String],
    example: ['https://example.com/clinic-1.jpg'],
  })
  @IsOptional()
  @ToStringArray()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  photos?: string[];

  @ApiProperty({
    description: '推荐或纠错理由',
    example: '附近没有这家诊所的完整信息，想补充一下。',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
