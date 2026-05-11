import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(options: RedisOptions) {
    this.client = new Redis({
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      ...options,
    });
  }

  async ping() {
    await this.connectIfNeeded();

    return this.client.ping();
  }

  async get(key: string) {
    await this.connectIfNeeded();

    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    await this.connectIfNeeded();

    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }

    return this.client.set(key, value);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    await this.connectIfNeeded();

    return this.client.set(key, value, 'EX', ttlSeconds, 'NX');
  }

  async delete(...keys: string[]) {
    await this.connectIfNeeded();

    if (keys.length === 0) {
      return 0;
    }

    return this.client.del(...keys);
  }

  async deleteByPattern(pattern: string, count = 100) {
    await this.connectIfNeeded();

    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );

      if (keys.length > 0) {
        deletedCount += await this.client.del(...keys);
      }

      cursor = nextCursor;
    } while (cursor !== '0');

    return deletedCount;
  }

  async consumeRateLimit(key: string, limit: number, ttlSeconds: number) {
    await this.connectIfNeeded();

    const result = (await this.client.eval(
      `
        local current = redis.call("INCR", KEYS[1])
        if current == 1 then
          redis.call("EXPIRE", KEYS[1], ARGV[2])
        end
        if current > tonumber(ARGV[1]) then
          return {0, current}
        end
        return {1, current}
      `,
      1,
      key,
      limit,
      ttlSeconds,
    )) as [number, number];

    return {
      allowed: Number(result[0]) === 1,
      current: Number(result[1]),
    };
  }

  async deleteIfEquals(key: string, expectedValue: string) {
    await this.connectIfNeeded();

    return this.client.eval(
      `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end
        return 0
      `,
      1,
      key,
      expectedValue,
    );
  }

  getClient() {
    return this.client;
  }

  private async connectIfNeeded() {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  async onApplicationShutdown() {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
