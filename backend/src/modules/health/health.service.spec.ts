import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { RedisService } from '../redis/redis.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };
  let redisService: { ping: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    redisService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'app.name':
                  return 'pet-clinic-recommendation-backend';
                case 'app.nodeEnv':
                  return 'test';
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('returns ok when app, database, and redis are all healthy', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redisService.ping.mockResolvedValue('PONG');

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.dependencies.app).toEqual(
      expect.objectContaining({
        status: 'up',
        name: 'pet-clinic-recommendation-backend',
        env: 'test',
      }),
    );
    expect(result.dependencies.database).toEqual({ status: 'up' });
    expect(result.dependencies.redis).toEqual({ status: 'up' });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('returns liveness information without dependency checks', async () => {
    const result = await service.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.app).toEqual(
      expect.objectContaining({
        status: 'up',
        name: 'pet-clinic-recommendation-backend',
        env: 'test',
      }),
    );
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(redisService.ping).not.toHaveBeenCalled();
  });

  it('returns ready when database and redis are healthy', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redisService.ping.mockResolvedValue('PONG');

    const result = await service.getReadiness();

    expect(result.status).toBe('ready');
    expect(result.dependencies.database).toEqual({ status: 'up' });
    expect(result.dependencies.redis).toEqual({ status: 'up' });
  });

  it('returns not_ready when redis is unavailable', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redisService.ping.mockRejectedValue(new Error('redis unavailable'));

    const result = await service.getReadiness();

    expect(result.status).toBe('not_ready');
    expect(result.dependencies.database).toEqual({ status: 'up' });
    expect(result.dependencies.redis).toEqual({
      status: 'down',
      message: 'redis unavailable',
    });
  });

  it('returns degraded when database is unavailable', async () => {
    dataSource.query.mockRejectedValue(new Error('database unavailable'));
    redisService.ping.mockResolvedValue('PONG');

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toEqual({
      status: 'down',
      message: 'database unavailable',
    });
    expect(result.dependencies.redis).toEqual({ status: 'up' });
  });

  it('returns degraded when redis is unavailable', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redisService.ping.mockRejectedValue(new Error('redis unavailable'));

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database).toEqual({ status: 'up' });
    expect(result.dependencies.redis).toEqual({
      status: 'down',
      message: 'redis unavailable',
    });
  });
});
