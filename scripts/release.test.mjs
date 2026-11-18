// Run by `pnpm check` (step release) with `node --test`.
// `pnpm release <major|minor|patch>` (ADR 0022): the next version and the release file.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bumpVersion,
  planRelease,
  setPackageVersion,
  NEXT_TEMPLATE,
} from './release.mjs';

const NOW = new Date('2026-12-05T09:00:00.000Z');

describe('bumpVersion', () => {
  it('major resets minor and patch; the first release is 0.0.0 -> 1.0.0', () => {
    assert.equal(bumpVersion('0.0.0', 'major'), '1.0.0');
    assert.equal(bumpVersion('1.4.2', 'major'), '2.0.0');
  });
  it('minor resets patch', () => {
    assert.equal(bumpVersion('1.4.2', 'minor'), '1.5.0');
  });
  it('patch only raises patch', () => {
    assert.equal(bumpVersion('1.4.2', 'patch'), '1.4.3');
  });
  it('refuses an unknown kind and a version that is not X.Y.Z', () => {
    assert.throws(() => bumpVersion('1.0.0', 'huge'), /major, minor or patch/);
    assert.throws(() => bumpVersion('1.0', 'patch'), /X\.Y\.Z/);
  });
});

describe('setPackageVersion', () => {
  it('replaces only the top-level version and keeps the formatting', () => {
    const text =
      '{\n  "name": "sfl",\n  "version": "0.0.0",\n  "x": {"version": "9.9.9"}\n}\n';
    assert.equal(
      setPackageVersion(text, '1.0.0'),
      '{\n  "name": "sfl",\n  "version": "1.0.0",\n  "x": {"version": "9.9.9"}\n}\n',
    );
  });
  it('refuses a package.json without version', () => {
    assert.throws(
      () => setPackageVersion('{"name":"sfl"}', '1.0.0'),
      /version/,
    );
  });
});

describe('planRelease', () => {
  const next = `---\ntitle: First release\n---\n\n- **New** (Statistics) Rating. [S10.1](../backlog/E10-product-features/S10.1.md)\n`;

  it('turns the draft into docs/releases/X.Y.Z.md with the version and the date', () => {
    const plan = planRelease({
      current: '0.0.0',
      kind: 'major',
      now: NOW,
      next,
      exists: () => false,
    });
    assert.equal(plan.version, '1.0.0');
    assert.equal(plan.tag, 'v1.0.0');
    assert.equal(plan.commitMessage, 'chore(release): 1.0.0');
    assert.equal(plan.file, 'docs/releases/1.0.0.md');
    assert.match(
      plan.content,
      /^---\nversion: 1\.0\.0\ndate: 2026-12-05\ntitle: First release\n---\n/,
    );
    assert.match(plan.content, /\*\*New\*\* \(Statistics\) Rating\./);
  });

  it('without a draft writes the template, so there is something to fill in', () => {
    const plan = planRelease({
      current: '1.0.0',
      kind: 'patch',
      now: NOW,
      next: undefined,
      exists: () => false,
    });
    assert.match(plan.content, /version: 1\.0\.1/);
    assert.ok(plan.content.includes(NEXT_TEMPLATE.split('---\n')[2].trim()));
  });

  it('refuses a draft that has no title: the page needs a heading', () => {
    assert.throws(
      () =>
        planRelease({
          current: '1.0.0',
          kind: 'minor',
          now: NOW,
          next: '---\ntitle:\n---\nx',
          exists: () => false,
        }),
      /title/,
    );
  });

  it('refuses a draft without changes', () => {
    assert.throws(
      () =>
        planRelease({
          current: '1.0.0',
          kind: 'minor',
          now: NOW,
          next: '---\ntitle: T\n---\n<!-- empty -->\n',
          exists: () => false,
        }),
      /no changes/,
    );
  });

  it('refuses when the release file already exists', () => {
    assert.throws(
      () =>
        planRelease({
          current: '1.0.0',
          kind: 'minor',
          now: NOW,
          next,
          exists: () => true,
        }),
      /already exists/,
    );
  });
});
