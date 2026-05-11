import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let redisService: { consumeRateLimit: jest.Mock };
  let guard: RateLimitGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    redisService = {
      consumeRateLimit: jest.fn(),
    };
    guard = new RateLimitGuard(
      reflector as unknown as Reflector,
      redisService as never,
    );
  });

  it('allows requests when no rate limit metadata is configured', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    expect(redisService.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('consumes quota and allows request when under the limit', async () => {
    const options: RateLimitOptions = {
      limit: 10,
      ttlSeconds: 60,
      keyPrefix: 'read',
    };
    reflector.getAllAndOverride.mockReturnValue(options);
    redisService.consumeRateLimit.mockResolvedValue({
      allowed: true,
      current: 3,
    });
    const request = {
      method: 'GET',
      baseUrl: '/clinics',
      route: { path: '/nearby' },
      ip: '127.0.0.1',
      user: { userId: 'user-1' },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redisService.consumeRateLimit).toHaveBeenCalledWith(
      'rate-limit:read:GET:/clinics/nearby:user-1',
      10,
      60,
    );
  });

  it('throws too many requests when quota is exhausted', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 1,
      ttlSeconds: 60,
      keyPrefix: 'write',
    });
    redisService.consumeRateLimit.mockResolvedValue({
      allowed: false,
      current: 2,
    });
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          baseUrl: '/tags',
          route: { path: '/submit' },
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;

    try {
      await guard.canActivate(context);
      fail('Expected rate limit guard to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });
});
