import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

const DEFAULT_JWT_SECRET = 'dev_only_change_me';
const DEFAULT_DB_USERNAME = 'postgres';
const DEFAULT_DB_PASSWORD = 'postgres_password';
const DEFAULT_DB_HOST = '127.0.0.1';
const DEFAULT_REDIS_HOST = '127.0.0.1';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsBoolean()
  TRUST_PROXY?: boolean;

  @IsOptional()
  @IsIn(['postgres'])
  DB_TYPE?: string;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  DB_PORT?: number;

  @IsOptional()
  @IsString()
  DB_USERNAME?: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DB_DATABASE?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  WECHAT_APPID?: string;

  @IsOptional()
  @IsString()
  WECHAT_SECRET?: string;

  @IsOptional()
  @IsString()
  WECHAT_API_BASE_URL?: string;

  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  LOG_DIR?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  REDIS_DB?: number;

  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  @IsOptional()
  @IsString()
  SWAGGER_PATH?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  enforceProductionSafety(validatedConfig);

  return validatedConfig;
}

function enforceProductionSafety(config: EnvironmentVariables) {
  const isProduction = config.NODE_ENV === 'production';

  if (!isProduction) {
    return;
  }

  const errors: string[] = [];

  if (!config.JWT_SECRET || config.JWT_SECRET === DEFAULT_JWT_SECRET) {
    errors.push('JWT_SECRET must be set to a non-default value in production');
  }

  if (!config.DB_HOST) {
    errors.push('DB_HOST is required in production');
  }

  if (!config.DB_USERNAME || config.DB_USERNAME === DEFAULT_DB_USERNAME) {
    errors.push(
      'DB_USERNAME must be set explicitly and cannot use the default value in production',
    );
  }

  if (!config.DB_PASSWORD || config.DB_PASSWORD === DEFAULT_DB_PASSWORD) {
    errors.push(
      'DB_PASSWORD must be set explicitly and cannot use the default value in production',
    );
  }

  if (!config.DB_DATABASE) {
    errors.push('DB_DATABASE is required in production');
  }

  if (config.DB_HOST === DEFAULT_DB_HOST) {
    errors.push(
      'DB_HOST cannot remain 127.0.0.1 in production unless you intentionally override this safeguard',
    );
  }

  if (config.REDIS_HOST === DEFAULT_REDIS_HOST) {
    errors.push(
      'REDIS_HOST cannot remain 127.0.0.1 in production unless you intentionally override this safeguard',
    );
  }

  if (!config.WECHAT_APPID) {
    errors.push('WECHAT_APPID is required in production');
  }

  if (!config.WECHAT_SECRET) {
    errors.push('WECHAT_SECRET is required in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid production environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }
}
