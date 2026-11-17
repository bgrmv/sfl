// Structure of the FSD layers (S3.26). The imports between layers and slices are
// checked by ESLint (`fsdBoundaries`, S3.8, ADR 0016); Steiger adds what it cannot see:
// lonely and dead slices, names of segments. Reasons for every switched-off rule below.
import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // `shared` is a set of segments imported by file (`@shared/auth/auth.service`):
    // an `index.ts` in each of 7 segments would only repeat the file names.
    files: ['./src/shared/**'],
    rules: {
      'fsd/public-api': 'off',
      'fsd/no-public-api-sidestep': 'off',
      // `constants`, `pipes`, `store`, `utils` are old names; renaming them touches
      // most of the client. Revisit with the next big move of files.
      'fsd/segments-by-purpose': 'off',
    },
  },
  {
    // A slice with one user or none: the pages of the old client that wait for
    // the decision of S10.8 (hidden pages) and the pieces of the new admin.
    files: [
      './src/features/captain-add/**',
      './src/features/captain-select/**',
      './src/features/game-table/**',
      './src/features/player-toggle-captain/**',
      './src/features/captain-table/**',
      './src/features/captain-toggle/**',
      './src/features/auth-sign-in/**',
      './src/features/game-edit/**',
      './src/features/player-select/**',
      // Entities used only by the slices above or by one page
      './src/entities/captain/**',
      './src/entities/team/**',
    ],
    rules: { 'fsd/insignificant-slice': 'off' },
  },
]);
