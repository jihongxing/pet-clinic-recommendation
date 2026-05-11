import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { EmotionType, TagLayer } from '../../database/entities';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GetMyReviewsQueryDto } from './dto/get-my-reviews-query.dto';
import { GetTagSelectionConfigQueryDto } from './dto/get-tag-selection-config-query.dto';
import { GetTagsQueryDto } from './dto/get-tags-query.dto';
import { SubmitTagDto } from './dto/submit-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取标签列表' })
  @ApiQuery({
    name: 'layer',
    required: false,
    enum: TagLayer,
    description: '按标签层级筛选',
  })
  @ApiQuery({
    name: 'userSelectable',
    required: false,
    type: Boolean,
    description: '是否仅返回用户可选标签',
  })
  @ApiOkResponse({ description: '按层级和分类组织返回标签列表' })
  @READ_RATE_LIMIT
  getTags(@Query() query: GetTagsQueryDto) {
    return this.tagsService.getTags(query);
  }

  @Get('selection-config')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取标签选择页配置' })
  @ApiQuery({
    name: 'emotion',
    required: true,
    enum: EmotionType,
    description: '情绪类型',
  })
  @ApiOkResponse({ description: '返回当前情绪对应的原因标签池和补充标签配置' })
  @READ_RATE_LIMIT
  getTagSelectionConfig(@Query() query: GetTagSelectionConfigQueryDto) {
    return this.tagsService.getTagSelectionConfig(query.emotion);
  }

  @Get('my')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前用户的评价历史' })
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
  @ApiOkResponse({ description: '返回当前用户的评价历史列表' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @READ_RATE_LIMIT
  getMyReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMyReviewsQueryDto,
  ) {
    return this.tagsService.getMyReviews(user.userId!, query);
  }

  @Post('submit')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ResponseMessage('感谢您的反馈！')
  @ApiOperation({ summary: '提交诊所评价标签' })
  @ApiBody({ type: SubmitTagDto })
  @ApiOkResponse({ description: '提交成功并返回本次评价权重信息' })
  @ApiBadRequestResponse({ description: '请求参数不合法或缺少有效预约记录' })
  @ApiConflictResponse({
    description: '用户已评价过该诊所，或当前请求为重复提交',
  })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @WRITE_RATE_LIMIT
  submitTag(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SubmitTagDto,
    @Req() request: Request,
  ) {
    const deviceIdHeader = request.headers['x-device-id'];
    const deviceId =
      typeof deviceIdHeader === 'string'
        ? deviceIdHeader
        : Array.isArray(deviceIdHeader)
          ? deviceIdHeader[0]
          : null;

    return this.tagsService.submitTag(user.userId!, payload, {
      ipAddress: request.ip,
      deviceId,
    });
  }
}
