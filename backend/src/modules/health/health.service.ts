import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async getHealth() {
    const [app, database, redis] = await Promise.all([
      this.checkApp(),
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status:
        app.status === 'up' && database.status === 'up' && redis.status === 'up'
          ? 'ok'
          : 'degraded',
      timestamp: new Date().toISOString(),
      dependencies: {
        app,
        database,
        redis,
      },
    };
  }

  private async checkApp() {
    return {
      status: 'up' as const,
      name:
        this.configService.get<string>('app.name') ??
        'pet-clinic-recommendation-backend',
      env: this.configService.get<string>('app.nodeEnv') ?? 'development',
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');

      return { status: 'up' as const };
    } catch (error) {
      return {
        status: 'down' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis() {
    try {
      const response = await this.redisService.ping();

      return {
        status: response === 'PONG' ? ('up' as const) : ('down' as const),
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: error instanceof Error ? error.message : 'Unknown redis error',
      };
    }
  }
}
