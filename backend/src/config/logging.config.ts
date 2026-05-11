import { registerAs } from '@nestjs/config';

export default registerAs('logging', () => ({
  level:
    process.env.LOG_LEVEL ??
    ((process.env.NODE_ENV ?? 'development') === 'production'
      ? 'info'
      : 'debug'),
  dir: process.env.LOG_DIR ?? 'logs',
}));
