import type { MEDIA_MIME_TYPES } from '@sfl/schemas';

export type MediaMime = (typeof MEDIA_MIME_TYPES)[number];

export const EXTENSIONS: Record<MediaMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * The type of a photo by its first bytes. The name and the type the browser
 * sends are never trusted: a script renamed to `.png` must not be stored as a photo.
 */
export function detectImageType(content: Buffer): MediaMime | null {
  if (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    content.length >= 8 &&
    content
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    content.length >= 12 &&
    content.toString('latin1', 0, 4) === 'RIFF' &&
    content.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
