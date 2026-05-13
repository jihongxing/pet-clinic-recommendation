import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { HealthService } from './health.service';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ResponseMessage('success')
  @ApiOperation({ summary: '检查服务与依赖健康状态' })
  @ApiOkResponse({ description: '返回应用、数据库与 Redis 健康状态' })
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const health = await this.healthService.getHealth();

    if (health.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }

  @Get('live')
  @ResponseMessage('success')
  @ApiOperation({ summary: '检查服务进程是否存活' })
  @ApiOkResponse({ description: '返回应用进程存活状态' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ResponseMessage('success')
  @ApiOperation({ summary: '检查服务是否已准备好接收流量' })
  @ApiOkResponse({ description: '返回数据库与 Redis 就绪状态' })
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== 'ready') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return readiness;
  }
}
