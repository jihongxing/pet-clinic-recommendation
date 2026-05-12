import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

import { ClinicSubmissionReviewAction } from '../../../database/entities';
import { ToNumber } from './shared.dto';

const CLINIC_SUBMISSION_REVIEW_ACTION_OPTIONS = [
  ClinicSubmissionReviewAction.ApprovedNew,
  ClinicSubmissionReviewAction.Merged,
  ClinicSubmissionReviewAction.NeedInfo,
  ClinicSubmissionReviewAction.Rejected,
] as const;

export class ReviewClinicSubmissionDto {
  @ApiProperty({
    description: '审核动作',
    enum: CLINIC_SUBMISSION_REVIEW_ACTION_OPTIONS,
    example: ClinicSubmissionReviewAction.ApprovedNew,
  })
  @IsIn(CLINIC_SUBMISSION_REVIEW_ACTION_OPTIONS)
  action!: ClinicSubmissionReviewAction;

  @ApiPropertyOptional({
    description: '审核备注',
    example: '资料完整，创建新诊所',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description: '合并到已有诊所时的目标诊所 ID',
    example: 12,
  })
  @ValidateIf((object) => object.action === ClinicSubmissionReviewAction.Merged)
  @ToNumber()
  @IsInt()
  @Min(1)
  matchedClinicId?: number;
}
