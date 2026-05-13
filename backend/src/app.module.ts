import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import loggingConfig from './config/logging.config';
import redisConfig from './config/redis.config';
import { validate } from './config/env.validation';
import { DATABASE_ENTITIES } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { ClinicSubmissionsModule } from './modules/clinic-submissions/clinic-submissions.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './modules/logging/logging.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RequestLoggingMiddleware } from './modules/logging/request-logging.middleware';
import { MetricsMiddleware } from './modules/metrics/metrics.middleware';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RedisModule } from './modules/redis/redis.module';
import { TagsModule } from './modules/tags/tags.module';
import { UserModule } from './modules/users/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [appConfig, authConfig, databaseConfig, loggingConfig, redisConfig],
      validate,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host') ?? '127.0.0.1',
        port: configService.get<number>('database.port') ?? 5432,
        username: configService.get<string>('database.username') ?? 'postgres',
        password:
          configService.get<string>('database.password') ?? 'postgres_password',
        database:
          configService.get<string>('database.database') ??
          'pet_clinic_recommendation',
        entities: [...DATABASE_ENTITIES],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    LoggingModule,
    MetricsModule,
    AuthModule,
    ClinicSubmissionsModule,
    ClinicsModule,
    OrdersModule,
    RedisModule,
    HealthModule,
    TagsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
