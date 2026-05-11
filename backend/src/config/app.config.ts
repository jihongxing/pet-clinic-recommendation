import { registerAs } from '@nestjs/config';

import { API_PREFIX, APP_NAME } from '../common/constants/app.constants';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? APP_NAME,
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? API_PREFIX,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  swaggerPath: process.env.SWAGGER_PATH ?? 'api-docs',
}));
