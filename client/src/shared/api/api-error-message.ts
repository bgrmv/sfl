import type { ApiError, ApiIssue } from '@sfl/schemas';

const MAX_ISSUES = 5;

function formatIssue({ path, message }: ApiIssue): string | null {
  if (!message) return null;
  return path ? `${path}: ${message}` : message;
}

/** Human-readable text for the `ApiError` of a failed call (see `toResult`). */
export function apiErrorMessage(error: ApiError): string {
  const issues = (error.issues ?? [])
    .map(formatIssue)
    .filter((issue): issue is string => issue !== null);

  if (issues.length) {
    const shown = issues.slice(0, MAX_ISSUES).join('\n');
    const rest = issues.length - MAX_ISSUES;
    return rest > 0 ? `${shown}\n…and ${rest} more` : shown;
  }
  if (error.code === 'INTERNAL_ERROR') return 'Server error. Try again later.';
  return error.message || 'Something went wrong. Try again.';
}
