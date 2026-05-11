import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ResponseMessage } from './common/decorators/response-message.decorator';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取服务启动信息' })
  @ApiOkResponse({ description: '返回服务名称与启动消息' })
  getRoot() {
    return this.appService.getRoot();
  }
}
