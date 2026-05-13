import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CapabilityVerificationStatus } from '../../../database/entities';

const CAPABILITY_VERIFICATION_STATUS_OPTIONS = [
  CapabilityVerificationStatus.Pending,
  CapabilityVerificationStatus.Verified,
  CapabilityVerificationStatus.Rejected,
] as const;

export class UpsertClinicCapabilityItemDto {
  @ApiProperty({
    description: '能力 code',
    example: 'eq_ultrasound',
  })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    description: '审核状态',
    enum: CAPABILITY_VERIFICATION_STATUS_OPTIONS,
    default: CapabilityVerificationStatus.Verified,
  })
  @IsOptional()
  @IsIn(CAPABILITY_VERIFICATION_STATUS_OPTIONS)
  verificationStatus?: CapabilityVerificationStatus;

  @ApiPropertyOptional({
    description: '审核备注',
    example: '门头公示和院内设备照片已核验',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpsertClinicCapabilitiesDto {
  @ApiProperty({
    description: '能力档案完整替换列表',
    type: [UpsertClinicCapabilityItemDto],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => UpsertClinicCapabilityItemDto)
  items!: UpsertClinicCapabilityItemDto[];
}
