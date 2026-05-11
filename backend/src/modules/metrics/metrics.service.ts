import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

type HttpMetricLabel = 'method' | 'endpoint' | 'status';
type HttpDurationLabel = 'method' | 'endpoint';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly apiRequestCounter: Counter<HttpMetricLabel>;
  private readonly apiErrorCounter: Counter<HttpMetricLabel>;
  private readonly apiResponseTimeHistogram: Histogram<HttpDurationLabel>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
    });

    this.apiRequestCounter = new Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.registry],
    });

    this.apiErrorCounter = new Counter({
      name: 'api_request_errors_total',
      help: 'Total number of failed API requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.registry],
    });

    this.apiResponseTimeHistogram = new Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  recordHttpRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const requestLabels = {
      method: method.toUpperCase(),
      endpoint,
      status: String(statusCode),
    };

    this.apiRequestCounter.inc(requestLabels);
    this.apiResponseTimeHistogram.observe(
      {
        method: requestLabels.method,
        endpoint,
      },
      durationSeconds,
    );

    if (statusCode >= 400) {
      this.apiErrorCounter.inc(requestLabels);
    }
  }

  async getMetrics() {
    return this.registry.metrics();
  }

  getContentType() {
    return this.registry.contentType;
  }
}
