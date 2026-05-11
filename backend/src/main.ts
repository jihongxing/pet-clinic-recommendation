import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { API_PREFIX } from './common/constants/app.constants';
import { validationExceptionFactory } from './common/factories/validation-exception.factory';
import { AppLoggerService } from './modules/logging/logging.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);

  app.useLogger(logger);

  if (configService.get<boolean>('app.trustProxy')) {
    app.set('trust proxy', true);
  }

  app.setGlobalPrefix(
    configService.get<string>('app.apiPrefix') ?? API_PREFIX,
    {
      exclude: [
        {
          path: 'metrics',
          method: RequestMethod.GET,
        },
      ],
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const swaggerEnabled =
    configService.get<boolean>('app.swaggerEnabled') ?? true;
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
  logger.log(
    {
      port,
      apiPrefix: configService.get<string>('app.apiPrefix') ?? API_PREFIX,
      trustProxy: configService.get<boolean>('app.trustProxy') ?? false,
      swaggerEnabled,
      logDirectory: logger.getLogDirectory(),
    },
    'Bootstrap',
  );
}

void bootstrap();
