import { format } from 'date-fns';

export interface BuildInfo {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
}

/** `1.0.0` is the first release (ADR 0022): `0.x` is a build before it. */
export const isPreRelease = (version: string): boolean =>
  version.startsWith('0.');

/** "This build" line: version, commit (when git was there) and the date. */
export function buildLabel(info: BuildInfo): string {
  const parts = [info.version];
  if (info.commit !== 'unknown') parts.push(info.commit);
  parts.push(format(new Date(info.builtAt), 'd MMM yyyy'));
  return parts.join(' · ');
}
