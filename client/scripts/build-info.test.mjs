// Run by `pnpm check` (step client:build-info) with `node --test`.
// What the build writes to build-info.generated.ts: the product version from the root
// package.json (ADR 0022), the commit and the date.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildInfoSource, readBuildInfo } from './build-info.mjs';

const NOW = new Date('2026-11-18T10:30:00.000Z');

describe('readBuildInfo', () => {
  it('takes the version from the root package.json, not from the client', () => {
    const info = readBuildInfo({
      readRootVersion: () => '1.4.0',
      gitCommit: () => 'abc1234',
      now: NOW,
    });
    assert.deepEqual(info, {
      version: '1.4.0',
      commit: 'abc1234',
      builtAt: '2026-11-18T10:30:00.000Z',
    });
  });

  it('falls back to "unknown" when there is no git (a build from an archive)', () => {
    const info = readBuildInfo({
      readRootVersion: () => '1.0.0',
      gitCommit: () => {
        throw new Error('not a git repository');
      },
      now: NOW,
    });
    assert.equal(info.commit, 'unknown');
  });

  it('refuses a version that is not semver, so the footer never shows garbage', () => {
    assert.throws(
      () =>
        readBuildInfo({
          readRootVersion: () => '1.0',
          gitCommit: () => 'abc1234',
          now: NOW,
        }),
      /semver/,
    );
  });

  it('refuses a root package.json without version', () => {
    assert.throws(
      () =>
        readBuildInfo({
          readRootVersion: () => undefined,
          gitCommit: () => 'abc1234',
          now: NOW,
        }),
      /version/,
    );
  });
});

describe('buildInfoSource', () => {
  it('writes a TypeScript module with one BUILD_INFO constant', () => {
    const source = buildInfoSource({
      version: '1.4.0',
      commit: 'abc1234',
      builtAt: '2026-11-18T10:30:00.000Z',
    });
    assert.match(source, /do not edit or commit/);
    assert.match(source, /export const BUILD_INFO = \{/);
    assert.match(source, /version: '1\.4\.0'/);
    assert.match(source, /commit: 'abc1234'/);
  });
});
