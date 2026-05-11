import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { RESPONSE_CODE } from '../constants/response-code.constants';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';
import { ApiResponse } from '../interfaces/api-response.interface';

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'data' in value
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_METADATA,
        context.getHandler(),
      ) ?? 'success';

    return next.handle().pipe(
      map((data) => {
        if (isApiResponse(data)) {
          return data as ApiResponse<T>;
        }

        return {
          code: RESPONSE_CODE.SUCCESS,
          message,
          data: (data ?? null) as T | null,
        };
      }),
    );
  }
}
