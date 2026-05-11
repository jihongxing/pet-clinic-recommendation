import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
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
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ConfirmVisitDto } from './dto/confirm-visit.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetMyOrdersQueryDto } from './dto/get-my-orders-query.dto';
import { OrdersService } from './orders.service';
import { OrderStatus } from '../../database/entities';

@ApiTags('orders')
@ApiBearerAuth('bearer')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('success')
  @ApiOperation({ summary: '创建预约点击记录' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ description: '返回已创建的预约点击记录' })
  @ApiBadRequestResponse({
    description: '请求参数不合法或诊所缺少对应联系方式',
  })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @ApiNotFoundResponse({ description: '诊所不存在' })
  @WRITE_RATE_LIMIT
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.userId!, payload);
  }

  @Post(':id/confirm-visit')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('success')
  @ApiOperation({ summary: '确认是否已就诊' })
  @ApiParam({ name: 'id', type: Number, description: '预约记录 ID' })
  @ApiBody({ type: ConfirmVisitDto })
  @ApiOkResponse({ description: '返回确认后的预约状态和确认时间' })
  @ApiBadRequestResponse({ description: '请求参数不合法或预约状态不允许确认' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @ApiNotFoundResponse({ description: '预约记录不存在' })
  @ApiConflictResponse({
    description: '预约记录已被其他流程处理，无法重复确认',
  })
  @WRITE_RATE_LIMIT
  confirmVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: ConfirmVisitDto,
  ) {
    return this.ordersService.confirmVisit(user.userId!, id, payload);
  }

  @Get(':id/review-eligibility')
  @UseGuards(UserAuthGuard)
  @ResponseMessage('success')
  @ApiOperation({ summary: '判断预约是否具备高权重评价资格' })
  @ApiParam({ name: 'id', type: Number, description: '预约记录 ID' })
  @ApiOkResponse({ description: '返回当前预约是否可评价及是否具备高权重资格' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @ApiNotFoundResponse({ description: '预约记录不存在' })
  @READ_RATE_LIMIT
  getReviewEligibility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getReviewEligibility(user.userId!, id);
  }

  @Get('my')
  @UseGuards(UserAuthGuard)
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前用户的预约历史' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    description: '预约状态筛选',
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
  @ApiOkResponse({ description: '返回当前用户的预约历史列表' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @READ_RATE_LIMIT
  getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMyOrdersQueryDto,
  ) {
    return this.ordersService.getMyOrders(user.userId!, query);
  }
}
