import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  apiErrorCodeFor,
  err,
  type ApiError,
  type ApiIssue,
} from '@sfl/schemas';
import type { Response } from 'express';

/**
 * One error format for the whole API: `{ ok: false, error: { status, code, message, issues? } }`
 * (`Result` of `@sfl/schemas`, serialized). Database errors get a proper status instead
 * of a 500, and a real 500 never shows its internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const error = this.toError(exception);

    if (error.status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(error.status).json(err(error).toJSON());
  }

  private toError(exception: unknown): ApiError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const { message, issues } =
        typeof response === 'string'
          ? { message: response, issues: undefined }
          : (response as { message?: string | string[]; issues?: ApiIssue[] });

      return {
        status,
        code: issues?.length ? 'VALIDATION_FAILED' : apiErrorCodeFor(status),
        message: Array.isArray(message)
          ? message.join('; ')
          : (message ?? exception.message),
        ...(issues?.length ? { issues } : null),
      };
    }

    const error = exception as {
      name?: string;
      code?: number;
      path?: string;
      errors?: Record<string, { path: string; message: string }>;
    };

    // Mongoose: a value that cannot be cast, for example a broken ObjectId
    if (error?.name === 'CastError') {
      return this.error(
        HttpStatus.BAD_REQUEST,
        `Invalid ${error.path ?? 'value'}`,
      );
    }

    if (error?.name === 'ValidationError' && error.errors) {
      return {
        ...this.error(HttpStatus.BAD_REQUEST, 'Validation failed'),
        code: 'VALIDATION_FAILED',
        issues: Object.values(error.errors).map(({ path, message }) => ({
          path,
          message,
        })),
      };
    }

    // MongoDB: unique index violation
    if (error?.code === 11000) {
      return this.error(HttpStatus.CONFLICT, 'The record already exists');
    }

    return this.error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
    );
  }

  private error(status: HttpStatus, message: string): ApiError {
    return { status, code: apiErrorCodeFor(status), message };
  }
}
