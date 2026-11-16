/**
 * Failures that no screen can fix and every screen would report the same way:
 * no answer from the server (0) and a server fault (5xx). The HTTP error
 * interceptor shows them once; stores report only the other errors.
 */
export const isGlobalStatus = (status: number): boolean =>
  status === 0 || status >= 500;

export const globalErrorMessage = (status: number): string =>
  status === 0
    ? 'No connection to the server. Check the network and try again.'
    : 'Server error. Try again later.';

/** The same rule for the `ApiError` a store gets from `toResult`. */
export const isGlobalApiError = (error: {
  status: number;
  code: string;
}): boolean => error.code === 'NETWORK_ERROR' || error.status >= 500;
