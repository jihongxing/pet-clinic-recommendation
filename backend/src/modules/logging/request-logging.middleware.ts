import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppLoggerService } from './logging.service';

type RequestWithContext = Request & {
  requestId?: string;
  user?: AuthenticatedUser;
};

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      this.logger.logRequest({
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: request.ip || 'unknown',
        userAgent: request.get('user-agent') ?? undefined,
        userId: request.user
          ? `${request.user.actorType}:${request.user.actorId}`
          : undefined,
      });
    });

    next();
  }
}
