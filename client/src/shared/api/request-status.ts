/** One format of the state of a request for every store (S3.22). */
export type RequestStatus =
  'idle' | 'pending' | 'fulfilled' | { error: string };

export type RequestStatusState = { requestStatus: RequestStatus };

export const isPending = (status: RequestStatus): boolean =>
  status === 'pending';

export const errorOf = (status: RequestStatus): string | null =>
  typeof status === 'object' ? status.error : null;
