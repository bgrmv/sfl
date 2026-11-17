// WCAG 2.2 AA of the pairs "text on background" of the dark theme (S10.12): the
// tokens are read from tokens.scss, so a changed colour that breaks a pair fails here.
import { describe, expect, it } from 'vitest';
import tokensSource from './tokens.scss?raw';

const source: string = tokensSource;
const dark = source.slice(0, source.indexOf(":root[data-theme='light']"));
const token = (name: string): string => {
  const match = new RegExp(`--sfl-${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(dark);
  if (!match) throw new Error(`token --sfl-${name} is not in the dark set`);
  const hex = match[1].slice(1);
  return hex.length === 3
    ? hex
        .split('')
        .map(c => c + c)
        .join('')
    : hex;
};

const luminance = (hex: string): number => {
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => {
  const [light, darker] = [luminance(token(a)), luminance(token(b))].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (darker + 0.05);
};

describe('contrast of the dark theme (WCAG 2.2 AA)', () => {
  // [text, background, minimum]: 4.5 for text, 3 for large text and borders of controls
  const pairs: [string, string, number][] = [
    ['text', 'bg', 4.5],
    ['text', 'surface', 4.5],
    ['text', 'surface-2', 4.5],
    ['muted', 'bg', 4.5],
    ['muted', 'surface', 4.5],
    ['muted', 'surface-2', 4.5],
    ['accent', 'bg', 4.5],
    ['link', 'bg', 4.5],
    ['link', 'surface', 4.5],
    ['on-accent', 'accent', 4.5],
    ['neg', 'bg', 4.5],
    ['neg', 'surface', 4.5],
    ['on-neg', 'neg', 4.5],
    // The colours of the teams: the red shirt as text and the white one under its label
    ['honda', 'bg', 4.5],
    ['honda', 'surface', 4.5],
    ['on-bmw', 'bmw', 4.5],
    ['text', 'score-bg', 4.5],
    ['accent', 'score-bg', 4.5],
  ];

  it.each(pairs)('%s on %s is at least %d:1', (fg, bg, minimum) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(minimum);
  });

  it('computes the ratio like the references: black on white is 21:1', () => {
    const black = luminance('000000');
    const white = luminance('ffffff');
    expect((white + 0.05) / (black + 0.05)).toBeCloseTo(21, 5);
  });
});
