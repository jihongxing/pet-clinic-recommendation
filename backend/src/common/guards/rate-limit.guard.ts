import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { RESPONSE_CODE } from '../constants/response-code.constants';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RedisService } from '../../modules/redis/redis.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthenticatedUser;
      }
    >();

    const routePath = this.resolveRoutePath(request);
    const subject =
      (request.user
        ? `${request.user.actorType}:${request.user.actorId}`
        : undefined) ??
      request.ip ??
      request.headers['x-forwarded-for']?.toString() ??
      'anonymous';
    const key = [
      'rate-limit',
      options.keyPrefix ?? 'default',
      request.method.toUpperCase(),
      routePath,
      subject,
    ].join(':');

    const { allowed } = await this.redisService.consumeRateLimit(
      key,
      options.limit,
      options.ttlSeconds,
    );

    if (!allowed) {
      throw new HttpException(
        {
          code: RESPONSE_CODE.TOO_MANY_REQUESTS,
          message: '请求过于频繁，请稍后再试',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveRoutePath(request: Request) {
    const baseUrl = request.baseUrl || '';
    const routePath =
      typeof request.route?.path === 'string'
        ? request.route.path
        : request.path || request.url || 'unknown';

    return `${baseUrl}${routePath}`;
  }
}
