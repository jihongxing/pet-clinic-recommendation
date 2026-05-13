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
import { READ_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { WRITE_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClinicSubmissionsService } from './clinic-submissions.service';
import { GetAdminClinicSubmissionsQueryDto } from './dto/get-admin-clinic-submissions-query.dto';
import { ReviewClinicSubmissionDto } from './dto/review-clinic-submission.dto';

@ApiTags('admin-clinic-submissions')
@ApiBearerAuth('bearer')
@Controller('admin/clinic-submissions')
@UseGuards(AdminAuthGuard)
export class AdminClinicSubmissionsController {
  constructor(
    private readonly clinicSubmissionsService: ClinicSubmissionsService,
  ) {}

  @Get()
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取推荐审核列表' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '按推荐状态筛选',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: '按城市筛选',
  })
  @ApiQuery({
    name: 'createdFrom',
    required: false,
    type: String,
    description: '按提交时间起始筛选，支持 YYYY-MM-DD 或 ISO 时间',
  })
  @ApiQuery({
    name: 'createdTo',
    required: false,
    type: String,
    description: '按提交时间结束筛选，支持 YYYY-MM-DD 或 ISO 时间',
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
  @ApiOkResponse({ description: '返回推荐审核队列列表' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @READ_RATE_LIMIT
  getAdminSubmissions(@Query() query: GetAdminClinicSubmissionsQueryDto) {
    return this.clinicSubmissionsService.getAdminSubmissions(query);
  }

  @Get(':id')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取推荐审核详情' })
  @ApiParam({ name: 'id', type: Number, description: '推荐单 ID' })
  @ApiOkResponse({ description: '返回推荐详情、候选匹配和历史重复提交' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @ApiNotFoundResponse({ description: '推荐单不存在' })
  @READ_RATE_LIMIT
  getAdminSubmissionDetail(@Param('id', ParseIntPipe) id: number) {
    return this.clinicSubmissionsService.getAdminSubmissionDetail(id);
  }

  @Get(':id/review-logs')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取推荐审核日志' })
  @ApiParam({ name: 'id', type: Number, description: '推荐单 ID' })
  @ApiOkResponse({ description: '返回推荐单审核日志列表' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @ApiNotFoundResponse({ description: '推荐单不存在' })
  @READ_RATE_LIMIT
  getAdminSubmissionReviewLogs(@Param('id', ParseIntPipe) id: number) {
    return this.clinicSubmissionsService.getAdminSubmissionReviewLogs(id);
  }

  @Post(':id/review')
  @ResponseMessage('审核完成')
  @ApiOperation({ summary: '执行推荐审核动作' })
  @ApiParam({ name: 'id', type: Number, description: '推荐单 ID' })
  @ApiBody({ type: ReviewClinicSubmissionDto })
  @ApiOkResponse({ description: '返回审核后的推荐单结果' })
  @ApiBadRequestResponse({ description: '审核动作不合法或推荐单信息不足' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @ApiNotFoundResponse({ description: '推荐单或目标诊所不存在' })
  @WRITE_RATE_LIMIT
  reviewSubmission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ReviewClinicSubmissionDto,
  ) {
    return this.clinicSubmissionsService.reviewSubmission(
      user.adminUserId!,
      id,
      payload,
    );
  }
}
