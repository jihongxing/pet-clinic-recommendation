import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateCapabilityDefinitionDto } from './dto/create-capability-definition.dto';
import { GetCapabilityDefinitionsQueryDto } from './dto/get-capability-definitions-query.dto';
import { UpdateCapabilityDefinitionDto } from './dto/update-capability-definition.dto';
import { UpsertClinicCapabilitiesDto } from './dto/upsert-clinic-capabilities.dto';
import { ClinicsService } from './clinics.service';

@ApiTags('admin-clinic-capabilities')
@ApiBearerAuth('bearer')
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminClinicCapabilitiesController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get('capability-definitions')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取能力字典管理列表' })
  @ApiOkResponse({ description: '返回后台使用的能力字典列表' })
  @READ_RATE_LIMIT
  listCapabilityDefinitions(@Query() query: GetCapabilityDefinitionsQueryDto) {
    return this.clinicsService.listCapabilityDefinitionsForAdmin(query);
  }

  @Post('capability-definitions')
  @ResponseMessage('能力字典项已创建')
  @ApiOperation({ summary: '创建能力字典项' })
  @ApiBody({ type: CreateCapabilityDefinitionDto })
  @WRITE_RATE_LIMIT
  createCapabilityDefinition(@Body() payload: CreateCapabilityDefinitionDto) {
    return this.clinicsService.createCapabilityDefinition(payload);
  }

  @Patch('capability-definitions/:id')
  @ResponseMessage('能力字典项已更新')
  @ApiOperation({ summary: '更新能力字典项' })
  @ApiBody({ type: UpdateCapabilityDefinitionDto })
  @WRITE_RATE_LIMIT
  updateCapabilityDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCapabilityDefinitionDto,
  ) {
    return this.clinicsService.updateCapabilityDefinition(id, payload);
  }

  @Delete('capability-definitions/:id')
  @ResponseMessage('能力字典项已删除')
  @ApiOperation({ summary: '删除能力字典项' })
  @WRITE_RATE_LIMIT
  deleteCapabilityDefinition(@Param('id', ParseIntPipe) id: number) {
    return this.clinicsService.deleteCapabilityDefinition(id);
  }

  @Get('clinics/:id/capabilities')
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取诊所能力档案' })
  @ApiOkResponse({ description: '返回指定诊所当前能力档案' })
  @READ_RATE_LIMIT
  getClinicCapabilities(@Param('id', ParseIntPipe) id: number) {
    return this.clinicsService.getClinicCapabilities(id);
  }

  @Put('clinics/:id/capabilities')
  @ResponseMessage('诊所能力档案已更新')
  @ApiOperation({ summary: '替换诊所能力档案' })
  @ApiBody({ type: UpsertClinicCapabilitiesDto })
  @WRITE_RATE_LIMIT
  updateClinicCapabilities(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertClinicCapabilitiesDto,
  ) {
    return this.clinicsService.replaceClinicCapabilities(
      id,
      payload,
      user.adminUserId!,
    );
  }
}
