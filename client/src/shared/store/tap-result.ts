import type { ApiError, ApiResult } from '@sfl/schemas';
import { MonoTypeOperatorFunction, tap } from 'rxjs';

/**
 * The one place of a store where a request becomes a side effect: `ok` writes
 * the answer into the state, `err` reports the failure. Put it after
 * `toResult()`. The stream never errors: a handler that throws is logged and
 * the next value still arrives, so an `rxMethod` stays subscribed.
 */
export function tapResult<T>(handlers: {
  ok: (value: T) => void;
  err: (error: ApiError) => void;
}): MonoTypeOperatorFunction<ApiResult<T>> {
  return tap(result => {
    try {
      result.match(handlers);
    } catch (error) {
      console.error('A handler of a result threw:', error);
    }
  });
}
