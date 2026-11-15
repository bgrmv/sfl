import { HttpErrorResponse } from '@angular/common/http';
import {
  apiErrorCodeFor,
  apiErrorSchema,
  err,
  ok,
  type ApiError,
  type ApiResponse,
  type ApiResult,
} from '@sfl/schemas';
import {
  catchError,
  map,
  of,
  type Observable,
  type OperatorFunction,
} from 'rxjs';

/** An error of the transport (no body of the API) in the shape of the API. */
function toApiError(error: unknown): ApiError {
  const thrown = apiErrorSchema.safeParse(error);
  if (thrown.success) return thrown.data;

  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiResponse<unknown>> | null;
    if (body && body.ok === false && body.error) return body.error;

    return error.status === 0
      ? {
          status: 0,
          code: 'NETWORK_ERROR',
          message: 'No connection to the server.',
        }
      : {
          status: error.status,
          code: apiErrorCodeFor(error.status),
          message: error.message,
        };
  }

  return {
    status: 0,
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Turns a call of `HttpService` into an `ApiResult<T>`: the stream never
 * errors, the failure is a value. Use it where the screen reacts to the error
 * (a form, a save button) instead of a `catchError` in every place.
 */
export function toResult<T>(): OperatorFunction<T, ApiResult<T>> {
  return (source: Observable<T>) =>
    source.pipe(
      map(value => ok<T, ApiError>(value)),
      catchError(error => of(err<T, ApiError>(toApiError(error)))),
    );
}
