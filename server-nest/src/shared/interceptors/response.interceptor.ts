import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ok, type SerializedResult } from '@sfl/schemas';
import { Observable, map } from 'rxjs';

/**
 * Wraps every successful answer of a controller into `{ ok: true, data }`
 * (`Result` of `@sfl/schemas`, serialized). Controllers return plain values and
 * never touch `@Res()`, so the format is the same everywhere.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SerializedResult<T | null, never>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SerializedResult<T | null, never>> {
    return next.handle().pipe(map(value => ok(value ?? null).toJSON()));
  }
}
