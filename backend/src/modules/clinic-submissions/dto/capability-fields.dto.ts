import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ToCodeArray } from './shared.dto';

function CapabilityCodeArrayProperty(description: string, example: string[]) {
  return ApiPropertyOptional({
    description,
    type: [String],
    example,
  });
}

export class ClinicSubmissionCapabilityFieldsDto {
  @CapabilityCodeArrayProperty('服务项目 code 列表', [
    'srv_outpatient',
    'srv_emergency',
  ])
  @IsOptional()
  @ToCodeArray()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  services?: string[];

  @CapabilityCodeArrayProperty('专长领域 code 列表', ['sp_cat'])
  @IsOptional()
  @ToCodeArray()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  specialties?: string[];

  @CapabilityCodeArrayProperty('设备能力 code 列表', ['eq_ultrasound'])
  @IsOptional()
  @ToCodeArray()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  equipment?: string[];

  @CapabilityCodeArrayProperty('设施能力 code 列表', ['fc_inpatient'])
  @IsOptional()
  @ToCodeArray()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  facilities?: string[];

  @CapabilityCodeArrayProperty('接诊宠物类型 code 列表', ['species_cat'])
  @IsOptional()
  @ToCodeArray()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  speciesSupported?: string[];

  @ApiPropertyOptional({
    description: '能力补充说明',
    example: '夜间有值班医生，B超需要提前预约。',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  capabilityNotes?: string;
}
