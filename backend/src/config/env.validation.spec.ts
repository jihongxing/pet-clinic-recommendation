import appConfig from './app.config';
import { validate } from './env.validation';

describe('environment validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps swagger enabled by default outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SWAGGER_ENABLED;

    expect(appConfig()).toEqual(
      expect.objectContaining({
        nodeEnv: 'development',
        swaggerEnabled: true,
      }),
    );
  });

  it('disables swagger by default in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;

    expect(appConfig()).toEqual(
      expect.objectContaining({
        nodeEnv: 'production',
        swaggerEnabled: false,
      }),
    );
  });

  it('rejects unsafe production defaults', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        PORT: 3000,
        APP_NAME: 'pet-clinic-recommendation-backend',
        API_PREFIX: 'api/v1',
        TRUST_PROXY: false,
        DB_TYPE: 'postgres',
        DB_HOST: '127.0.0.1',
        DB_PORT: 5432,
        DB_USERNAME: 'postgres',
        DB_PASSWORD: 'postgres_password',
        DB_DATABASE: 'pet_clinic_recommendation',
        JWT_SECRET: 'dev_only_change_me',
        JWT_EXPIRES_IN: '7d',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: 6379,
        REDIS_DB: 0,
        SWAGGER_ENABLED: false,
        SWAGGER_PATH: 'api-docs',
      }),
    ).toThrow(/Invalid production environment configuration/);
  });

  it('accepts explicit production-safe configuration', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        PORT: 3000,
        APP_NAME: 'pet-clinic-recommendation-backend',
        API_PREFIX: 'api/v1',
        TRUST_PROXY: true,
        DB_TYPE: 'postgres',
        DB_HOST: 'postgres.internal',
        DB_PORT: 5432,
        DB_USERNAME: 'petmed_app',
        DB_PASSWORD: 'super-secret-password',
        DB_DATABASE: 'petmed_prod',
        JWT_SECRET: 'super-secret-jwt',
        JWT_EXPIRES_IN: '7d',
        WECHAT_APPID: 'wx-prod-appid',
        WECHAT_SECRET: 'wx-prod-secret',
        REDIS_HOST: 'redis.internal',
        REDIS_PORT: 6379,
        REDIS_DB: 0,
        SWAGGER_ENABLED: false,
        SWAGGER_PATH: 'api-docs',
      }),
    ).not.toThrow();
  });
});
