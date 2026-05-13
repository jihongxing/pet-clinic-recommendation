import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Max, Min } from 'class-validator';

import { ClinicSubmissionStatus } from '../../../database/entities';
import { ToNumber } from './shared.dto';

const CLINIC_SUBMISSION_STATUS_OPTIONS = [
  ClinicSubmissionStatus.PendingReview,
  ClinicSubmissionStatus.NeedInfo,
  ClinicSubmissionStatus.ApprovedNew,
  ClinicSubmissionStatus.Merged,
  ClinicSubmissionStatus.Rejected,
] as const;

export class GetMyClinicSubmissionsQueryDto {
  @ApiPropertyOptional({
    description: '状态筛选',
    enum: CLINIC_SUBMISSION_STATUS_OPTIONS,
    example: ClinicSubmissionStatus.PendingReview,
  })
  @IsOptional()
  @IsIn(CLINIC_SUBMISSION_STATUS_OPTIONS)
  status?: ClinicSubmissionStatus;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
  })
  @IsOptional()
  @ToNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页数量，最大 50',
    default: 20,
  })
  @IsOptional()
  @ToNumber()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
