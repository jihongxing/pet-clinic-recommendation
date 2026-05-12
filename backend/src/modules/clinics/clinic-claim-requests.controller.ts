import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { READ_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ClinicClaimRequestDetailResult,
  ClinicsService,
  GetMyClinicClaimRequestsResult,
} from './clinics.service';

@ApiTags('clinic-claim-requests')
@Controller('clinic-claim-requests')
export class ClinicClaimRequestsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('my')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前用户提交的认领申请列表' })
  @ApiOkResponse({ description: '返回当前用户的认领申请列表' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的用户 Bearer Token' })
  @READ_RATE_LIMIT
  getMyClaimRequests(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetMyClinicClaimRequestsResult> {
    return this.clinicsService.getMyClinicClaimRequests(user.userId!);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取认领申请详情' })
  @ApiParam({ name: 'id', type: Number, description: '认领申请 ID' })
  @ApiOkResponse({ description: '返回认领申请详情、状态和审核备注' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @ApiNotFoundResponse({ description: '认领申请不存在' })
  @READ_RATE_LIMIT
  getClaimRequestDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClinicClaimRequestDetailResult> {
    return this.clinicsService.getClinicClaimRequestDetail(id, user);
  }
}
