import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RedisService,
      useFactory: (configService: ConfigService) =>
        new RedisService({
          host: configService.get<string>('redis.host') ?? '127.0.0.1',
          port: configService.get<number>('redis.port') ?? 6379,
          password: configService.get<string | undefined>('redis.password'),
          db: configService.get<number>('redis.db') ?? 0,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
