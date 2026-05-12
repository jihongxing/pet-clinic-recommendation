import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClinicsService } from './clinics.service';
import { GetAdminClaimRequestsQueryDto } from './dto/get-admin-claim-requests-query.dto';
import { ReviewClinicClaimRequestDto } from './dto/review-clinic-claim-request.dto';

@ApiTags('admin-claim-requests')
@ApiBearerAuth('bearer')
@Controller('admin/claim-requests')
@UseGuards(AdminAuthGuard)
export class AdminClinicClaimRequestsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取认领审核列表' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '按认领状态筛选',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: '每页数量，最大 50',
  })
  @ApiOkResponse({ description: '返回认领申请审核列表' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @READ_RATE_LIMIT
  getAdminClaimRequests(@Query() query: GetAdminClaimRequestsQueryDto) {
    return this.clinicsService.getAdminClaimRequests(query);
  }

  @Post(':id/review')
  @ResponseMessage('审核完成')
  @ApiOperation({ summary: '执行认领审核动作' })
  @ApiParam({ name: 'id', type: Number, description: '认领申请 ID' })
  @ApiBody({ type: ReviewClinicClaimRequestDto })
  @ApiOkResponse({ description: '返回审核后的认领申请结果' })
  @ApiBadRequestResponse({ description: '认领申请已进入终态或审核动作不合法' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @ApiNotFoundResponse({ description: '认领申请不存在' })
  @WRITE_RATE_LIMIT
  reviewClaimRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ReviewClinicClaimRequestDto,
  ) {
    return this.clinicsService.reviewClinicClaimRequest(
      user.adminUserId!,
      id,
      payload,
    );
  }
}
