export interface ErrorLogContext {
  requestId?: string;
  method?: string;
  path?: string;
  statusCode: number;
  errorCode?: number;
  message: string;
  stack?: string;
  exceptionName?: string;
  userId?: string;
  ip?: string;
}
