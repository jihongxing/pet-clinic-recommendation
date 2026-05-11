import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

import {
  RESPONSE_CODE,
  getErrorCodeByStatus,
} from '../constants/response-code.constants';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { AppLoggerService } from '../../modules/logging/logging.service';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<
      Request & {
        requestId?: string;
        user?: AuthenticatedUser;
      }
    >();

    const { status, code, message } = this.resolveExceptionPayload(exception);

    this.logger.logError({
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      statusCode: status,
      errorCode: code,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      exceptionName:
        exception instanceof Error ? exception.name : 'UnknownException',
      userId: request.user
        ? `${request.user.actorType}:${request.user.actorId}`
        : undefined,
      ip: request.ip,
    });

    const payload: ApiResponse<null> & {
      path: string;
      timestamp: string;
    } = {
      code,
      message,
      data: null,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }

  private resolveExceptionPayload(exception: unknown) {
    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: RESPONSE_CODE.DATABASE_ERROR,
        message: '数据库错误',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const payload = this.normalizeHttpExceptionResponse(response);

      return {
        status,
        code: payload.code ?? getErrorCodeByStatus(status),
        message: payload.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: RESPONSE_CODE.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
    };
  }

  private normalizeHttpExceptionResponse(response: string | object) {
    if (typeof response === 'string') {
      return { message: response };
    }

    const responseRecord = response as Record<string, unknown>;
    const message = responseRecord.message;

    if (Array.isArray(message)) {
      return {
        message: message.join('; '),
        code:
          typeof responseRecord.code === 'number'
            ? responseRecord.code
            : undefined,
      };
    }

    return {
      message:
        typeof message === 'string'
          ? message
          : typeof responseRecord.error === 'string'
            ? responseRecord.error
            : '请求失败',
      code:
        typeof responseRecord.code === 'number'
          ? responseRecord.code
          : undefined,
    };
  }
}
