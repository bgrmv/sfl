// The answer of the API is a `Result<T, ApiError>` (see result.ts). The error
// follows the idea of RFC 9457: status, a stable code, a message.
import * as z from 'zod/mini';

import type { Result, SerializedResult } from './result.js';

/** One failed field of a request. `path` is dotted: `statistics.2.position`. */
export const apiIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

/** Stable, machine-readable error codes. The client branches on them, not on texts. */
export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
  /** The request did not reach the server. Set by the client, never by the API. */
  'NETWORK_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  /** Same number as the HTTP status. */
  status: z.int(),
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  /** Only for `VALIDATION_FAILED`. */
  issues: z.optional(z.array(apiIssueSchema)),
});

export type ApiIssue = z.infer<typeof apiIssueSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * What every endpoint answers: `{ ok: true, data }` or `{ ok: false, error }`.
 * The HTTP status stays meaningful: 2xx for `ok: true`, 4xx and 5xx otherwise.
 */
export type ApiResponse<T> = SerializedResult<T, ApiError>;

/** Result of an API call inside the client and the server code. */
export type ApiResult<T> = Result<T, ApiError>;

/** Code for an HTTP status, when the thrower gave none. */
export function apiErrorCodeFor(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
  }
}
