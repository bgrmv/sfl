import type { BuildInfo } from '../lib/build-label';
import { BUILD_INFO as GENERATED } from '../../environments/build-info.generated';

/** Version, commit and date of this build; written by `scripts/set-env.mjs` (ADR 0022). */
export const BUILD_INFO: BuildInfo = GENERATED;
