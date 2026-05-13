import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ClinicSubmissionStatus } from '../../../database/entities';
import { ToNumber } from './shared.dto';

const CLINIC_SUBMISSION_STATUS_OPTIONS = [
  ClinicSubmissionStatus.PendingReview,
  ClinicSubmissionStatus.NeedInfo,
  ClinicSubmissionStatus.ApprovedNew,
  ClinicSubmissionStatus.Merged,
  ClinicSubmissionStatus.Rejected,
] as const;

export class GetAdminClinicSubmissionsQueryDto {
  @ApiPropertyOptional({
    description: '状态筛选',
    enum: CLINIC_SUBMISSION_STATUS_OPTIONS,
    example: ClinicSubmissionStatus.PendingReview,
  })
  @IsOptional()
  @IsIn(CLINIC_SUBMISSION_STATUS_OPTIONS)
  status?: ClinicSubmissionStatus;

  @ApiPropertyOptional({
    description: '城市筛选',
    example: '北京',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  city?: string;

  @ApiPropertyOptional({
    description: '提交时间起始，支持 YYYY-MM-DD 或 ISO 时间',
    example: '2026-05-12',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: '提交时间结束，支持 YYYY-MM-DD 或 ISO 时间',
    example: '2026-05-13',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

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
