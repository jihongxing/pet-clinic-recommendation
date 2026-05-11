import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  LOGIN_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { IssueDevTokenDto } from './dto/issue-dev-token.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('success')
  @ApiOperation({ summary: '使用微信 code 登录并返回 JWT' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ description: '返回 token 和当前登录用户信息' })
  @ApiBadRequestResponse({ description: 'code 无效或微信返回登录失败' })
  @ApiServiceUnavailableResponse({
    description: '微信登录配置缺失或上游服务不可用',
  })
  @LOGIN_RATE_LIMIT
  login(@Body() payload: WechatLoginDto) {
    return this.authService.login(payload.code);
  }

  @Post('dev-token')
  @ResponseMessage('success')
  @ApiOperation({ summary: '签发开发环境 JWT 令牌' })
  @ApiBody({ type: IssueDevTokenDto })
  @ApiOkResponse({ description: '返回开发环境 Bearer Token 与对应主体信息' })
  @ApiForbiddenResponse({ description: '生产环境默认禁用该接口' })
  @WRITE_RATE_LIMIT
  issueDevToken(@Body() payload: IssueDevTokenDto) {
    return this.authService.issueDevToken(payload);
  }
}
