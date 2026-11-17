import { environment } from '../../../environments/environment';

/** The address of the file of a photo, for `<img src>`; the file itself is public. */
export const mediaUrl = (id: string): string =>
  `${environment.apiUrl}/media/${id}/file`;
