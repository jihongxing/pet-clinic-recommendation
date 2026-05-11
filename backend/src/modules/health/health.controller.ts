import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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
  getHealth() {
    return this.healthService.getHealth();
  }
}
