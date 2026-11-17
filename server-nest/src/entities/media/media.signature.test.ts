import { describe, expect, it } from 'vitest';

import { detectImageType, EXTENSIONS } from './media.signature';

const bytes = (...values: number[]) => Buffer.from(values);
const ascii = (text: string) => Buffer.from(text, 'latin1');

describe('detectImageType: the type comes from the bytes, not from the name', () => {
  it('recognises JPEG, PNG and WebP', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe(
      'image/jpeg',
    );
    expect(
      detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe('image/png');
    expect(
      detectImageType(
        Buffer.concat([ascii('RIFF'), bytes(1, 2, 3, 4), ascii('WEBPVP8 ')]),
      ),
    ).toBe('image/webp');
  });

  it.each([
    ['GIF', ascii('GIF89a......')],
    ['an HTML page', ascii('<html><script>alert(1)</script>')],
    ['an SVG', ascii('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    [
      'a WAV file (RIFF, not WebP)',
      Buffer.concat([ascii('RIFF'), bytes(1, 2, 3, 4), ascii('WAVEfmt ')]),
    ],
    ['an empty file', Buffer.alloc(0)],
    ['a too short file', bytes(0xff, 0xd8)],
  ])('does not take %s for a photo', (_name, content) => {
    expect(detectImageType(content)).toBeNull();
  });

  it('has an extension for every accepted type', () => {
    expect(EXTENSIONS).toEqual({
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    });
  });
});
