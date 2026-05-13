import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LOGIN_RATE_LIMIT,
  READ_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-auth')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('success')
  @ApiOperation({ summary: '管理员登录并返回后台 JWT' })
  @ApiBody({ type: AdminLoginDto })
  @ApiOkResponse({ description: '返回管理员 Bearer Token 与当前管理员信息' })
  @ApiUnauthorizedResponse({
    description: '用户名或密码错误，或管理员账号已停用',
  })
  @LOGIN_RATE_LIMIT
  login(@Body() payload: AdminLoginDto) {
    return this.authService.loginAdmin(payload);
  }

  @Get('session')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前登录管理员信息' })
  @ApiOkResponse({ description: '返回当前管理员身份信息' })
  @ApiUnauthorizedResponse({
    description: '未提供或提供了无效的管理员 Bearer Token',
  })
  @READ_RATE_LIMIT
  getSession(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getAdminSession(user.adminUserId!);
  }
}
