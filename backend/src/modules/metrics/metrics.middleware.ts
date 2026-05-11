import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const endpoint = this.resolveRoutePath(request);

      if (endpoint === '/metrics') {
        return;
      }

      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

      this.metricsService.recordHttpRequest(
        request.method,
        endpoint,
        response.statusCode,
        Number(durationSeconds.toFixed(6)),
      );
    });

    next();
  }

  private resolveRoutePath(request: Request) {
    const baseUrl = request.baseUrl || '';
    const routePath =
      typeof request.route?.path === 'string'
        ? request.route.path
        : request.path || request.url || 'unknown';
    const normalizedPath = `${baseUrl}${routePath}` || '/';
    const apiPrefix =
      this.configService.get<string>('app.apiPrefix')?.trim() || 'api';
    const prefix = `/${apiPrefix}`;

    if (normalizedPath === prefix) {
      return '/';
    }

    return normalizedPath.startsWith(`${prefix}/`)
      ? normalizedPath.slice(prefix.length)
      : normalizedPath;
  }
}
