import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'dev_only_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  allowDevTokenIssuance:
    (process.env.NODE_ENV ?? 'development') !== 'production',
  allowMockWechatLogin:
    (process.env.NODE_ENV ?? 'development') !== 'production',
  wechatAppId: process.env.WECHAT_APPID ?? '',
  wechatSecret: process.env.WECHAT_SECRET ?? '',
  wechatApiBaseUrl:
    process.env.WECHAT_API_BASE_URL ??
    'https://api.weixin.qq.com/sns/jscode2session',
}));
