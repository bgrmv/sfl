// Run by `pnpm check` (step client:releases) with `node --test`.
// docs/releases/*.md -> the data of the Release notes page and its RSS feed (S10.51, ADR 0022).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseChange,
  parseEarlyHistory,
  parseRelease,
  releasesSource,
  rssFeed,
  sortReleases,
} from './releases.mjs';

const RELEASE = `---
version: 1.0.0
date: 2026-12-05
title: First release
---

- **New** (Statistics) Two scoring systems. [S10.1](../backlog/E10-product-features/S10.1.md)
- **Fixed** (Admin) A game saves again & shows errors.
`;

describe('parseChange', () => {
  it('takes the kind, the area, the text and the story', () => {
    assert.deepEqual(
      parseChange(
        '- **New** (Statistics) Two systems. [S10.1](../backlog/x/S10.1.md)',
      ),
      { kind: 'New', area: 'Statistics', text: 'Two systems.', story: 'S10.1' },
    );
  });
  it('story is optional', () => {
    assert.deepEqual(parseChange('- **Fixed** (Admin) A game saves.'), {
      kind: 'Fixed',
      area: 'Admin',
      text: 'A game saves.',
      story: undefined,
    });
  });
  it('"Under the hood" has no area', () => {
    assert.deepEqual(parseChange('- **Under the hood** Angular 22.'), {
      kind: 'Under the hood',
      area: undefined,
      text: 'Angular 22.',
      story: undefined,
    });
  });
  it('refuses an unknown kind or area: the filter of the page needs a closed list', () => {
    assert.throws(() => parseChange('- **Added** (Admin) x'), /kind/);
    assert.throws(() => parseChange('- **New** (Sport) x'), /area/);
  });
  it('is not a change when the line is not a list item', () => {
    assert.equal(parseChange('Some text'), undefined);
  });
});

describe('parseRelease', () => {
  it('reads the front matter and the changes', () => {
    const release = parseRelease(RELEASE, '1.0.0.md');
    assert.equal(release.version, '1.0.0');
    assert.equal(release.date, '2026-12-05');
    assert.equal(release.title, 'First release');
    assert.equal(release.changes.length, 2);
    assert.equal(release.changes[0].story, 'S10.1');
  });
  it('refuses a file whose version differs from its name', () => {
    assert.throws(() => parseRelease(RELEASE, '1.1.0.md'), /1\.1\.0/);
  });
  it('refuses a file without changes', () => {
    assert.throws(
      () => parseRelease(RELEASE.split('- **')[0], '1.0.0.md'),
      /no changes/,
    );
  });
});

describe('sortReleases', () => {
  it('puts the newest first by semver, not by text (1.10.0 > 1.9.0)', () => {
    const list = [
      { version: '1.9.0' },
      { version: '1.10.0' },
      { version: '0.9.9' },
    ];
    assert.deepEqual(
      sortReleases(list).map(r => r.version),
      ['1.10.0', '1.9.0', '0.9.9'],
    );
  });
});

describe('parseEarlyHistory', () => {
  it('splits the sections "## Early history · date · title"', () => {
    const text = `# x\n\n## Early history · 2024-04 · Matches\n\nA match can be saved.\n\n- **New** (Admin) Create a match.\n\n## Early history · 2024-12 · Rating\n\n- **New** (Statistics) Rating.\n`;
    const early = parseEarlyHistory(text);
    assert.equal(early.length, 2);
    assert.deepEqual(
      { date: early[0].date, title: early[0].title, lead: early[0].lead },
      { date: '2024-04', title: 'Matches', lead: 'A match can be saved.' },
    );
    assert.equal(early[1].changes[0].area, 'Statistics');
  });
});

describe('releasesSource', () => {
  it('writes one RELEASES constant as JSON', () => {
    const source = releasesSource({
      releases: [parseRelease(RELEASE, '1.0.0.md')],
      early: [],
    });
    assert.match(source, /do not edit or commit/);
    assert.match(source, /export const RELEASES_DATA = \{/);
    assert.match(source, /"version": "1\.0\.0"/);
  });
});

describe('rssFeed', () => {
  it('has an item per release with an absolute link and escaped text', () => {
    const xml = rssFeed({
      releases: [parseRelease(RELEASE, '1.0.0.md')],
      siteUrl: 'https://sfl.example',
    });
    assert.match(xml, /<rss version="2\.0"/);
    assert.match(xml, /<link>https:\/\/sfl\.example\/releases<\/link>/);
    assert.match(xml, /<title>1\.0\.0 — First release<\/title>/);
    assert.match(xml, /<pubDate>Sat, 05 Dec 2026 00:00:00 GMT<\/pubDate>/);
    // HTML inside <description> is escaped for the HTML first, then for the XML
    assert.match(xml, /saves again &amp;amp; shows errors/);
    assert.doesNotMatch(xml, /saves again & shows/);
  });
});
