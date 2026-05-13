import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { CapabilityType } from '../../../database/entities';

const CAPABILITY_TYPE_OPTIONS = [
  CapabilityType.Service,
  CapabilityType.Specialty,
  CapabilityType.Equipment,
  CapabilityType.Facility,
  CapabilityType.SpeciesSupported,
] as const;

export class GetCapabilityDefinitionsQueryDto {
  @ApiPropertyOptional({
    description: '能力类型筛选',
    enum: CAPABILITY_TYPE_OPTIONS,
  })
  @IsOptional()
  @IsIn(CAPABILITY_TYPE_OPTIONS)
  type?: CapabilityType;
}
