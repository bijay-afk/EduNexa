import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiEnvelope } from '@class10/types';

/** Wrap successful responses in the standard { data, meta, error } envelope (spec §58). */
@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(map((payload) => this.wrap(context, payload)));
  }

  private wrap(context: ExecutionContext, payload: T): ApiEnvelope<T> {
    const req = context.switchToHttp().getRequest();
    const meta: Record<string, unknown> = { path: req.url ?? '/', method: req.method ?? 'GET' };

    // Allow handlers to return { data, meta } already.
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'data' in (payload as object) &&
      'error' in (payload as object)
    ) {
      return payload as unknown as ApiEnvelope<T>;
    }
    if (payload !== null && typeof payload === 'object' && 'data' in (payload as object)) {
      const partial = payload as unknown as { data: unknown; meta?: unknown };
      if (partial.meta) meta.pagination = partial.meta;
      return { data: partial.data as T, meta, error: null };
    }
    return { data: payload, meta, error: null };
  }
}