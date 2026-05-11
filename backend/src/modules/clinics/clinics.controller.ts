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
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { READ_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { WRITE_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClinicAuthGuard } from '../auth/guards/clinic-auth.guard';
import { GetClinicDetailQueryDto } from './dto/get-clinic-detail-query.dto';
import {
  CLINIC_NEARBY_RADIUS_OPTIONS,
  CLINIC_SORT_TYPES,
  GetNearbyClinicsQueryDto,
} from './dto/get-nearby-clinics-query.dto';
import { SearchClinicsQueryDto } from './dto/search-clinics-query.dto';
import { SubmitClinicResponseDto } from './dto/submit-clinic-response.dto';
import {
  ClinicDetailResponse,
  ClinicResponseListResult,
  ClinicsService,
  NearbyClinicsResponse,
  SearchClinicsResponse,
  SubmitClinicResponseResult,
} from './clinics.service';

@ApiTags('clinics')
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('nearby')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取附近诊所列表' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: '纬度' })
  @ApiQuery({ name: 'lng', required: true, type: Number, description: '经度' })
  @ApiQuery({
    name: 'radius',
    required: false,
    enum: [...CLINIC_NEARBY_RADIUS_OPTIONS],
    description: '半径（米）',
  })
  @ApiQuery({
    name: 'sortType',
    required: false,
    enum: [...CLINIC_SORT_TYPES],
    description: '排序类型',
  })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    type: String,
    description: '标签 ID 列表，逗号分隔',
  })
  @ApiQuery({
    name: 'city',
    required: true,
    type: String,
    description: '城市名称',
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
  @ApiOkResponse({ description: '返回支持半径、排序和分页的诊所列表' })
  @READ_RATE_LIMIT
  getNearbyClinics(
    @Query() query: GetNearbyClinicsQueryDto,
  ): Promise<NearbyClinicsResponse> {
    return this.clinicsService.getNearbyClinics(query);
  }

  @Get('search')
  @ResponseMessage('success')
  @ApiOperation({ summary: '搜索诊所' })
  @ApiQuery({
    name: 'keyword',
    required: true,
    type: String,
    description: '搜索关键词，匹配诊所名称或地址',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: '城市名称',
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    type: Number,
    description: '纬度，用于计算距离',
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    type: Number,
    description: '经度，用于计算距离',
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
  @ApiOkResponse({ description: '返回按名称或地址模糊匹配的诊所列表' })
  @READ_RATE_LIMIT
  getSearchClinics(
    @Query() query: SearchClinicsQueryDto,
  ): Promise<SearchClinicsResponse> {
    return this.clinicsService.searchClinics(query);
  }

  @Get(':id')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取诊所详情' })
  @ApiParam({ name: 'id', type: Number, description: '诊所 ID' })
  @ApiQuery({
    name: 'lat',
    required: false,
    type: Number,
    description: '纬度，用于计算与诊所距离',
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    type: Number,
    description: '经度，用于计算与诊所距离',
  })
  @ApiOkResponse({ description: '返回诊所基础信息、标签聚合和分数字段' })
  @READ_RATE_LIMIT
  getClinicDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetClinicDetailQueryDto,
  ): Promise<ClinicDetailResponse> {
    return this.clinicsService.getClinicDetail(id, query);
  }

  @Get(':id/responses')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取诊所回应列表' })
  @ApiParam({ name: 'id', type: Number, description: '诊所 ID' })
  @ApiOkResponse({ description: '返回已审核通过的诊所回应列表' })
  @ApiNotFoundResponse({ description: '诊所不存在' })
  @READ_RATE_LIMIT
  getClinicResponses(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClinicResponseListResult> {
    return this.clinicsService.getClinicResponses(id);
  }

  @Post(':id/responses')
  @UseGuards(ClinicAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('提交成功，等待审核')
  @ApiOperation({ summary: '提交诊所标签回应' })
  @ApiParam({ name: 'id', type: Number, description: '诊所 ID' })
  @ApiOkResponse({ description: '返回诊所回应记录' })
  @ApiBadRequestResponse({
    description: '诊所未认领、回应内容过长或诊所账号无权操作该诊所',
  })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的诊所 Bearer Token',
  })
  @WRITE_RATE_LIMIT
  submitClinicResponse(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SubmitClinicResponseDto,
  ): Promise<SubmitClinicResponseResult> {
    return this.clinicsService.submitClinicResponse(id, user, payload);
  }
}
