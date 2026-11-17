// Run by `pnpm check` (step client:contrast) with `node --test`.
// WCAG 2.2 AA of the pairs "text on background" of the dark theme (S10.12): the
// tokens are read from tokens.scss, so a changed colour that breaks a pair fails here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../src/assets/styles/tokens.scss',
  ),
  'utf8',
);
const dark = source.slice(0, source.indexOf(":root[data-theme='light']"));
const token = name => {
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

const luminance = hex => {
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [light, darker] = [luminance(token(a)), luminance(token(b))].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (darker + 0.05);
};

describe('contrast of the dark theme (WCAG 2.2 AA)', () => {
  // [text, background, minimum]: 4.5 for text, 3 for large text and borders of controls
  const pairs = [
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

  for (const [fg, bg, minimum] of pairs) {
    it(`${fg} on ${bg} is at least ${minimum}:1`, () => {
      assert.ok(
        ratio(fg, bg) >= minimum,
        `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`,
      );
    });
  }

  it('computes the ratio like the references: black on white is 21:1', () => {
    const black = luminance('000000');
    const white = luminance('ffffff');
    assert.ok(Math.abs((white + 0.05) / (black + 0.05) - 21) < 1e-5);
  });
});
