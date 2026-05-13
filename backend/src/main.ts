import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

import { API_PREFIX } from './common/constants/app.constants';
import { validationExceptionFactory } from './common/factories/validation-exception.factory';
import { AppLoggerService } from './modules/logging/logging.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';
  const isProduction = nodeEnv === 'production';
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? API_PREFIX;

  app.useLogger(logger);
  app.enableShutdownHooks();
  app.useStaticAssets(join(__dirname, '..', '..', 'admin-console'), {
    prefix: '/admin-console/',
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  if (configService.get<boolean>('app.trustProxy')) {
    app.set('trust proxy', true);
  }

  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      {
        path: 'metrics',
        method: RequestMethod.GET,
      },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const swaggerEnabled =
    configService.get<boolean>('app.swaggerEnabled') ?? !isProduction;
  const swaggerPath =
    configService.get<string>('app.swaggerPath') ?? 'api-docs';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pet Clinic Recommendation API')
      .setDescription('宠物诊所口碑推荐小程序后端 API 文档')
      .setVersion('1.2.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '在此输入 Bearer Token',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      jsonDocumentUrl: `${swaggerPath}-json`,
    });
  }

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);

  if (!isProduction) {
    logger.warn(
      {
        message: 'Application is running in a non-production mode',
        nodeEnv,
        devTokenIssuanceEnabled:
          configService.get<boolean>('auth.allowDevTokenIssuance') ?? false,
        mockWechatLoginEnabled:
          configService.get<boolean>('auth.allowMockWechatLogin') ?? false,
      },
      'Bootstrap',
    );
  }

  logger.log(
    {
      port,
      nodeEnv,
      apiPrefix,
      trustProxy: configService.get<boolean>('app.trustProxy') ?? false,
      swaggerEnabled,
      swaggerPath: swaggerEnabled ? swaggerPath : null,
      healthEndpoints: {
        health: `/${apiPrefix}/health`,
        liveness: `/${apiPrefix}/health/live`,
        readiness: `/${apiPrefix}/health/ready`,
      },
      logDirectory: logger.getLogDirectory(),
    },
    'Bootstrap',
  );
}

void bootstrap();
