import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorShape } from '@class10/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiErrorShape = { code: 'INTERNAL_ERROR', message: 'Something went wrong' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        error = { code: this.codeFor(status), message: res };
      } else if (typeof res === 'object' && res !== null) {
        const body = res as {
          message?: string | string[];
          error?: string;
          details?: Record<string, unknown>;
        };
        error = {
          code: typeof body.error === 'string' ? body.error.toUpperCase() : this.codeFor(status),
          message: Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? body.error ?? 'Request failed'),
          details: body.details,
        };
      }
    } else if (exception instanceof Error) {
      // Don't leak internal error text to clients; log it fully.
      this.logger.error(exception.message, exception.stack, request?.url ?? '');
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        const isDev = process.env.NODE_ENV !== 'production';
        error.message = isDev ? exception.message : 'Something went wrong';
      }
    }

    response.status(status).json({
      data: null,
      meta: null,
      error,
    });
  }

  private codeFor(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}