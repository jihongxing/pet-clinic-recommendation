import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { AppLoggerService } from './logging.service';
import { WINSTON_LOGGER } from './logging.constants';

@Global()
@Module({
  providers: [
    {
      provide: WINSTON_LOGGER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get<string>('logging.level') ?? 'info';
        const logDirSetting =
          configService.get<string>('logging.dir') ?? 'logs';
        const logDir = resolve(process.cwd(), logDirSetting);

        if (!existsSync(logDir)) {
          mkdirSync(logDir, { recursive: true });
        }

        const consoleFormat = winston.format.printf(
          ({ timestamp, level, message, context, trace, ...meta }) => {
            const normalizedMessage =
              typeof message === 'string' ? message : JSON.stringify(message);
            const normalizedMeta =
              Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

            return `${timestamp} [${context ?? 'Application'}] ${level}: ${normalizedMessage}${trace ? `\n${trace}` : ''}${normalizedMeta}`;
          },
        );

        return winston.createLogger({
          level: logLevel,
          defaultMeta: {
            service: 'pet-clinic-recommendation-backend',
          },
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                consoleFormat,
              ),
            }),
            new winston.transports.DailyRotateFile({
              filename: resolve(logDir, 'error-%DATE%.log'),
              datePattern: 'YYYY-MM-DD',
              level: 'error',
              maxFiles: '30d',
              maxSize: '20m',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
            new winston.transports.DailyRotateFile({
              filename: resolve(logDir, 'combined-%DATE%.log'),
              datePattern: 'YYYY-MM-DD',
              maxFiles: '14d',
              maxSize: '50m',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
          ],
        });
      },
    },
    AppLoggerService,
  ],
  exports: [AppLoggerService, WINSTON_LOGGER],
})
export class LoggingModule {}
