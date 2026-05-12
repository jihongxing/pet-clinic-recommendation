import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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
import { AuthService } from './auth.service';
import { ClinicLoginDto } from './dto/clinic-login.dto';
import { ClinicAuthGuard } from './guards/clinic-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('clinic-auth')
@Controller('clinic')
export class ClinicAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('success')
  @ApiOperation({ summary: '诊所后台账号密码登录并返回诊所 JWT' })
  @ApiBody({ type: ClinicLoginDto })
  @ApiOkResponse({ description: '返回诊所 Bearer Token 与诊所账号信息' })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误，或诊所账号已停用' })
  @LOGIN_RATE_LIMIT
  login(@Body() payload: ClinicLoginDto) {
    return this.authService.loginClinic(payload);
  }

  @Get('session')
  @UseGuards(ClinicAuthGuard)
  @ApiBearerAuth('bearer')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前登录诊所账号信息' })
  @ApiOkResponse({ description: '返回当前诊所账号身份信息' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的诊所 Bearer Token' })
  @READ_RATE_LIMIT
  getSession(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getClinicSession(user.clinicAccountId!);
  }
}
