import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Logger } from 'winston';

import { ErrorLogContext } from './interfaces/error-log-context.interface';
import { RequestLogContext } from './interfaces/request-log-context.interface';
import { WINSTON_LOGGER } from './logging.constants';

@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(
    @Inject(WINSTON_LOGGER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }

  logRequest(context: RequestLogContext) {
    this.logger.info({
      message: 'HTTP request completed',
      context: 'HttpRequest',
      type: 'request',
      ...context,
    });
  }

  logError(context: ErrorLogContext) {
    this.logger.log({
      level: 'error',
      context: 'HttpException',
      type: 'error',
      ...context,
    });
  }

  getLogDirectory() {
    return this.configService.get<string>('logging.dir') ?? 'logs';
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    if (typeof message === 'object' && message !== null) {
      const normalizedMessage = message as Record<string, unknown>;

      this.logger.log({
        level,
        context,
        message:
          typeof normalizedMessage.message === 'string'
            ? normalizedMessage.message
            : JSON.stringify(normalizedMessage),
        ...normalizedMessage,
        ...(trace ? { trace } : {}),
      });

      return;
    }

    this.logger.log({
      level,
      context,
      message: String(message),
      ...(trace ? { trace } : {}),
    });
  }
}
