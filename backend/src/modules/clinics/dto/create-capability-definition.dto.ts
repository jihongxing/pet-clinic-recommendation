import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { CapabilityType } from '../../../database/entities';

const CAPABILITY_TYPE_OPTIONS = [
  CapabilityType.Service,
  CapabilityType.Specialty,
  CapabilityType.Equipment,
  CapabilityType.Facility,
  CapabilityType.SpeciesSupported,
] as const;

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

export class CreateCapabilityDefinitionDto {
  @ApiProperty({
    description: '能力 code',
    example: 'eq_ct',
  })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({
    description: '能力名称',
    example: 'CT',
  })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: '能力类型',
    enum: CAPABILITY_TYPE_OPTIONS,
  })
  @IsIn(CAPABILITY_TYPE_OPTIONS)
  type!: CapabilityType;

  @ApiPropertyOptional({
    description: '排序值',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '是否启用，1 启用 0 停用',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsIn([0, 1])
  isActive?: number;
}
