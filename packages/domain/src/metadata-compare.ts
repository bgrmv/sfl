import { IPlayerMetadata } from './metadata.js';

export interface MetadataDifference {
  field: string;
  stored: unknown;
  calculated: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function firstDifference(a: unknown[], b: unknown[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}

/**
 * The fields where the stored metadata differs from the calculated one
 * (verification of the incremental statistics, ADR 0017). Lists are
 * summarized, not printed.
 */
export function compareMetadata(
  stored: unknown,
  calculated: IPlayerMetadata,
  path = '',
): MetadataDifference[] {
  const differences: MetadataDifference[] = [];
  const storedRecord = isRecord(stored) ? stored : {};

  for (const [key, value] of Object.entries(calculated)) {
    const field = path ? `${path}.${key}` : key;
    const storedValue = storedRecord[key];

    if (Array.isArray(value)) {
      const storedList = Array.isArray(storedValue) ? storedValue : [];
      const at = firstDifference(storedList, value);
      if (at !== -1) {
        differences.push({
          field,
          stored: { length: storedList.length, firstDifferenceAt: at },
          calculated: { length: value.length, firstDifferenceAt: at },
        });
      }
    } else if (isRecord(value)) {
      differences.push(
        ...compareMetadata(storedValue, value as never, field),
      );
    } else if (storedValue !== value) {
      differences.push({
        field,
        stored: storedValue ?? null,
        calculated: value,
      });
    }
  }

  // A stored key the calculation does not have (an old shape of the data)
  for (const [key, storedValue] of Object.entries(storedRecord)) {
    if (!(key in calculated)) {
      differences.push({
        field: path ? `${path}.${key}` : key,
        stored: storedValue,
        calculated: null,
      });
    }
  }

  return differences;
}
