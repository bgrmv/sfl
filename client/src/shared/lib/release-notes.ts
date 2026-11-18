import { Injectable, signal } from '@angular/core';
import { RELEASES_DATA } from '../../environments/releases.generated';

export type ReleaseKind = 'New' | 'Improved' | 'Fixed' | 'Under the hood';
export type ReleaseArea =
  'Statistics' | 'Admin' | 'Players' | 'Community' | 'Design' | 'Access';

export const RELEASE_AREAS: readonly ReleaseArea[] = [
  'Statistics',
  'Admin',
  'Players',
  'Community',
  'Design',
  'Access',
];

export interface ReleaseChange {
  readonly kind: ReleaseKind;
  readonly area?: ReleaseArea;
  readonly text: string;
  readonly story?: string;
}

export interface ReleaseNote {
  readonly version: string;
  readonly date: string;
  readonly title: string;
  readonly changes: readonly ReleaseChange[];
}

export interface EarlyStage {
  readonly date: string;
  readonly title: string;
  readonly lead: string;
  readonly changes: readonly ReleaseChange[];
}

/** Notes of releases (newest first) and the early history; built from docs/releases (ADR 0022). */
export const RELEASE_NOTES = RELEASES_DATA as {
  releases: ReleaseNote[];
  early: EarlyStage[];
};

export function filterByArea<
  T extends { readonly changes: readonly ReleaseChange[] },
>(items: readonly T[], area: ReleaseArea | null): T[] {
  if (!area) return [...items];
  return items
    .map(item => ({
      ...item,
      changes: item.changes.filter(c => c.area === area),
    }))
    .filter(item => item.changes.length > 0);
}

export function hasUnseenRelease(
  latest: string | undefined,
  seen: string | null,
): boolean {
  return latest !== undefined && latest !== seen;
}

const SEEN_KEY = 'sfl.releases.seen';

/** The “new” dot of the menu: shown until the page of the last release was opened. */
@Injectable({ providedIn: 'root' })
export class ReleaseSeenService {
  private readonly latest = RELEASE_NOTES.releases[0]?.version;
  readonly unseen = signal(hasUnseenRelease(this.latest, read()));

  markSeen(): void {
    if (this.latest) write(this.latest);
    this.unseen.set(false);
  }
}

function read(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function write(version: string): void {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // storage is blocked: the dot comes back on the next visit, nothing breaks
  }
}
