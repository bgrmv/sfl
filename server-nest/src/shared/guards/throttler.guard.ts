import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Response } from 'express';

/**
 * The stock guard names the header `Retry-After-<throttler>`; clients and
 * proxies look for the standard `Retry-After` (seconds), so it is set here.
 * The answer itself is made by the global exception filter (429, TOO_MANY_REQUESTS).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse<Response>();
    const seconds = Math.ceil(
      Math.max(detail.timeToBlockExpire, detail.timeToExpire, 1),
    );
    res.setHeader('Retry-After', String(seconds));

    return super.throwThrottlingException(context, detail);
  }
}
