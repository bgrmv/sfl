import { HttpErrorResponse } from '@angular/common/http';

interface ApiIssue {
  path?: unknown;
  message?: unknown;
}

const MAX_ISSUES = 5;

function formatIssue({ path, message }: ApiIssue): string | null {
  if (typeof message !== 'string' || !message) return null;
  const where = Array.isArray(path) ? path.join('.') : path;
  return where ? `${where}: ${message}` : message;
}

/**
 * Human-readable text for a failed API call. Handles the global error format
 * `{ statusCode, message, issues?: [{ path, message }] }` (docs/PROJECT.md, 5.2).
 */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'No connection to the server.';

  const body = error.error;
  const issues: string[] = Array.isArray(body?.issues)
    ? body.issues.map(formatIssue).filter((i: string | null) => i !== null)
    : [];

  if (issues.length) {
    const shown = issues.slice(0, MAX_ISSUES).join('\n');
    const rest = issues.length - MAX_ISSUES;
    return rest > 0 ? `${shown}\n…and ${rest} more` : shown;
  }
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (Array.isArray(body?.message) && body.message.length)
    return body.message.join('\n');
  if (error.status >= 500) return 'Server error. Try again later.';
  return fallback;
}
