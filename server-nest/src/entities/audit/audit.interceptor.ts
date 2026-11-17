import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, catchError, concatMap, from, throwError } from 'rxjs';

import { AuditService } from './audit.service';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Writes down every change a signed-in person asked for (S10.21): who, method,
 * the route pattern, the status. Reads, requests of visitors (a comment, a
 * sign-in) and the body are not written. A failed write must never fail the request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { _id?: string } }>();
    const userId = req.user?._id;
    if (!WRITES.has(req.method) || !userId) return next.handle();

    const route = String(req.route?.path ?? req.path);
    const write = (status: number) =>
      this.audit
        .record({ userId, method: req.method, route, status })
        .catch(() => undefined);

    // The entry is written before the answer leaves: the log never lags behind the answer
    return next.handle().pipe(
      concatMap(async value => {
        await write(http.getResponse().statusCode);
        return value;
      }),
      catchError(error =>
        from(
          write(error instanceof HttpException ? error.getStatus() : 500),
        ).pipe(concatMap(() => throwError(() => error))),
      ),
    );
  }
}
