export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent?: string;
  userId?: string;
}
