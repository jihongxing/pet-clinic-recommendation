import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { READ_RATE_LIMIT } from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth('bearer')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(UserAuthGuard)
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiOkResponse({ description: '返回当前登录用户资料' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @READ_RATE_LIMIT
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getProfile(user.userId!);
  }
}
