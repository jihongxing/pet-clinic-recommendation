import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { ClaimStatus } from '../../../database/entities';

const CLAIM_STATUS_OPTIONS = [
  ClaimStatus.Pending,
  ClaimStatus.Approved,
  ClaimStatus.Rejected,
] as const;

export class GetAdminClaimRequestsQueryDto {
  @ApiPropertyOptional({
    description: '按认领状态筛选',
    enum: CLAIM_STATUS_OPTIONS,
  })
  @IsOptional()
  @IsIn(CLAIM_STATUS_OPTIONS)
  status?: ClaimStatus;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页数量，最大 50',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
