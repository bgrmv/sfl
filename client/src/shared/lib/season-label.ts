/** `2026` becomes `S26`, the career is `All time` (GLOSSARY: season is named by its year). */
export const ALL_TIME_LABEL = 'All time';

export const seasonLabel = (key: string): string =>
  key === 'all' ? ALL_TIME_LABEL : `S${key.slice(-2)}`;

export const seasonKeyOf = (label: string): string =>
  label === ALL_TIME_LABEL ? 'all' : `20${label.slice(1)}`;
