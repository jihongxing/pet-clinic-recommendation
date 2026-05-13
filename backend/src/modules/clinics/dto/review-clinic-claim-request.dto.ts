import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { ClaimStatus } from '../../../database/entities';

const CLINIC_CLAIM_REVIEW_ACTION_OPTIONS = [
  ClaimStatus.Approved,
  ClaimStatus.Rejected,
] as const;

export class ReviewClinicClaimRequestDto {
  @ApiProperty({
    description: '认领审核动作',
    enum: CLINIC_CLAIM_REVIEW_ACTION_OPTIONS,
    example: ClaimStatus.Approved,
  })
  @IsIn(CLINIC_CLAIM_REVIEW_ACTION_OPTIONS)
  action!: ClaimStatus;

  @ApiPropertyOptional({
    description: '审核备注',
    example: '证照和联系人信息一致',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
