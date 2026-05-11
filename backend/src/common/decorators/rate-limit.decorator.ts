import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number;
  ttlSeconds: number;
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);

export const READ_RATE_LIMIT = RateLimit({
  limit: 120,
  ttlSeconds: 60,
  keyPrefix: 'read',
});

export const WRITE_RATE_LIMIT = RateLimit({
  limit: 20,
  ttlSeconds: 60,
  keyPrefix: 'write',
});

export const LOGIN_RATE_LIMIT = RateLimit({
  limit: 10,
  ttlSeconds: 60,
  keyPrefix: 'auth-login',
});
