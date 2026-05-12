import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RESPONSE_CODE } from '../../common/constants/response-code.constants';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../../common/decorators/rate-limit.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClinicSubmissionsService } from './clinic-submissions.service';
import { CreateClinicSubmissionDto } from './dto/create-clinic-submission.dto';
import { GetClinicSubmissionMatchesQueryDto } from './dto/get-clinic-submission-matches-query.dto';
import { GetMyClinicSubmissionsQueryDto } from './dto/get-my-clinic-submissions-query.dto';

@ApiTags('clinic-submissions')
@ApiBearerAuth('bearer')
@Controller('clinic-submissions')
export class ClinicSubmissionsController {
  constructor(
    private readonly clinicSubmissionsService: ClinicSubmissionsService,
  ) {}

  @Post('photos')
  @UseGuards(UserAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
          callback(null, true);
          return;
        }

        callback(
          new BadRequestException({
            code: RESPONSE_CODE.PARAM_INVALID,
            message: '仅支持 JPG、PNG、WebP 图片上传',
          }),
          false,
        );
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('上传成功')
  @ApiOperation({ summary: '上传推荐诊所图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '图片文件，支持 JPG / PNG / WebP，最大 5MB',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: '返回可直接写入推荐单 photos 的图片 URL' })
  @ApiBadRequestResponse({ description: '文件缺失、格式不支持或大小超限' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @WRITE_RATE_LIMIT
  uploadSubmissionPhoto(
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    } | null,
    @Req()
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    if (!file) {
      throw new BadRequestException({
        code: RESPONSE_CODE.PARAM_INVALID,
        message: '请上传图片文件',
      });
    }

    return this.clinicSubmissionsService.storeSubmissionPhoto(file, request);
  }

  @Get('matches')
  @UseGuards(UserAuthGuard)
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取推荐前的候选重复诊所' })
  @ApiQuery({
    name: 'name',
    required: true,
    type: String,
    description: '诊所名称',
  })
  @ApiQuery({
    name: 'address',
    required: false,
    type: String,
    description: '诊所地址',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: '城市',
  })
  @ApiQuery({
    name: 'district',
    required: false,
    type: String,
    description: '区域',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    type: String,
    description: '联系电话',
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    type: Number,
    description: '纬度',
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    type: Number,
    description: '经度',
  })
  @ApiOkResponse({ description: '返回可能重复的候选诊所列表' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @READ_RATE_LIMIT
  getSubmissionMatches(
    @Query() query: GetClinicSubmissionMatchesQueryDto,
  ) {
    return this.clinicSubmissionsService.getSubmissionMatches(query);
  }

  @Get('my')
  @UseGuards(UserAuthGuard)
  @ResponseMessage('success')
  @ApiOperation({ summary: '获取当前用户的推荐记录' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '按推荐状态筛选',
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
  @ApiOkResponse({ description: '返回当前用户的推荐记录列表' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @READ_RATE_LIMIT
  getMySubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMyClinicSubmissionsQueryDto,
  ) {
    return this.clinicSubmissionsService.getMySubmissions(user.userId!, query);
  }

  @Post()
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('提交成功，等待审核')
  @ApiOperation({ summary: '提交诊所推荐、补充或纠错信息' })
  @ApiBody({ type: CreateClinicSubmissionDto })
  @ApiCreatedResponse({ description: '返回已创建的推荐单' })
  @ApiBadRequestResponse({ description: '请求参数不合法' })
  @ApiUnauthorizedResponse({ description: '未提供或提供了无效的 Bearer Token' })
  @ApiNotFoundResponse({ description: '关联诊所不存在' })
  @WRITE_RATE_LIMIT
  createSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateClinicSubmissionDto,
  ) {
    return this.clinicSubmissionsService.createSubmission(user.userId!, payload);
  }
}
