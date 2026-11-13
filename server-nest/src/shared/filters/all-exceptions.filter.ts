import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  [extra: string]: unknown;
}

/**
 * One error format for the whole API: `{ statusCode, message, error? }`, plus
 * `issues` for validation errors. Database errors get a proper status instead
 * of a 500, and a real 500 never shows its internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      return {
        ...(typeof response === 'string'
          ? { message: response }
          : (response as object)),
        statusCode: status,
      } as ErrorBody;
    }

    const error = exception as {
      name?: string;
      code?: number;
      path?: string;
      errors?: Record<string, { path: string; message: string }>;
    };

    // Mongoose: a value that cannot be cast, for example a broken ObjectId
    if (error?.name === 'CastError') {
      return this.body(
        HttpStatus.BAD_REQUEST,
        `Invalid ${error.path ?? 'value'}`,
      );
    }

    if (error?.name === 'ValidationError' && error.errors) {
      return {
        ...this.body(HttpStatus.BAD_REQUEST, 'Validation failed'),
        issues: Object.values(error.errors).map(({ path, message }) => ({
          path,
          message,
        })),
      };
    }

    // MongoDB: unique index violation
    if (error?.code === 11000) {
      return this.body(HttpStatus.CONFLICT, 'The record already exists');
    }

    return this.body(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
  }

  private body(status: HttpStatus, message: string): ErrorBody {
    return {
      statusCode: status,
      message,
      error: HttpStatus[status]
        .toLowerCase()
        .split('_')
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' '),
    };
  }
}
