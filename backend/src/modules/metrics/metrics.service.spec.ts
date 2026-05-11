import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('records request totals, latency and errors in prometheus format', async () => {
    service.recordHttpRequest('GET', '/clinics/nearby', 200, 0.245);
    service.recordHttpRequest('GET', '/clinics/nearby', 500, 0.812);

    const metrics = await service.getMetrics();

    expect(metrics).toContain('# HELP api_requests_total');
    expect(metrics).toContain(
      'api_requests_total{method="GET",endpoint="/clinics/nearby",status="200"} 1',
    );
    expect(metrics).toContain(
      'api_requests_total{method="GET",endpoint="/clinics/nearby",status="500"} 1',
    );
    expect(metrics).toContain('# HELP api_request_errors_total');
    expect(metrics).toContain(
      'api_request_errors_total{method="GET",endpoint="/clinics/nearby",status="500"} 1',
    );
    expect(metrics).toContain('# HELP api_response_time_seconds');
    expect(metrics).toContain(
      'api_response_time_seconds_sum{method="GET",endpoint="/clinics/nearby"}',
    );
  });
});
