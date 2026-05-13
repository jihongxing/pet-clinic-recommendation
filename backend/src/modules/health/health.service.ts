import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { RedisService } from '../redis/redis.service';

type DependencyStatus = { status: 'up' } | { status: 'down'; message: string };

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async getHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const app = this.getAppStatus();
    const isReady = this.isDependencyUp(database) && this.isDependencyUp(redis);

    return {
      status: isReady ? 'ok' : 'degraded',
      timestamp: this.getTimestamp(),
      dependencies: {
        app,
        database,
        redis,
      },
    };
  }

  async getLiveness() {
    return {
      status: 'ok' as const,
      timestamp: this.getTimestamp(),
      app: this.getAppStatus(),
    };
  }

  async getReadiness() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const isReady = this.isDependencyUp(database) && this.isDependencyUp(redis);

    return {
      status: isReady ? ('ready' as const) : ('not_ready' as const),
      timestamp: this.getTimestamp(),
      dependencies: {
        database,
        redis,
      },
    };
  }

  private getAppStatus() {
    return {
      status: 'up' as const,
      name:
        this.configService.get<string>('app.name') ??
        'pet-clinic-recommendation-backend',
      env: this.configService.get<string>('app.nodeEnv') ?? 'development',
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
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

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const response = await this.redisService.ping();

      if (response !== 'PONG') {
        return {
          status: 'down' as const,
          message: `Unexpected redis ping response: ${response}`,
        };
      }

      return {
        status: 'up' as const,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        message: error instanceof Error ? error.message : 'Unknown redis error',
      };
    }
  }

  private isDependencyUp(dependency: DependencyStatus) {
    return dependency.status === 'up';
  }

  private getTimestamp() {
    return new Date().toISOString();
  }
}
