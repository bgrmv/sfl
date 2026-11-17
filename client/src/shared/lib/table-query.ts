import { signal } from '@angular/core';

export type SortDir = 'asc' | 'desc';
export interface Sort {
  key: string;
  dir: SortDir;
}

export type FieldType = 'text' | 'number';
export interface FilterField {
  key: string;
  label: string;
  type: FieldType;
}

/** Positive: is, contains, ≥, ≤. Negative: is not, does not contain, <, >. */
export type FilterOp =
  'is' | 'isNot' | 'contains' | 'notContains' | 'gte' | 'lte' | 'gt' | 'lt';

export interface Filter {
  field: string;
  op: FilterOp;
  value: string;
}

export const OP_LABEL: Record<FilterOp, string> = {
  is: 'is',
  isNot: 'is not',
  contains: 'contains',
  notContains: 'does not contain',
  gte: '≥',
  lte: '≤',
  gt: '>',
  lt: '<',
};

export const OPS: Record<FieldType, FilterOp[]> = {
  text: ['contains', 'notContains', 'is', 'isNot'],
  number: ['is', 'isNot', 'gte', 'lte', 'gt', 'lt'],
};

type Row = Record<string, unknown>;

const norm = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase();

export function matches(row: Row, f: Filter, fields: readonly FilterField[]) {
  const type = fields.find(x => x.key === f.field)?.type ?? 'text';
  const raw = row[f.field];
  if (type === 'number') {
    const missing = raw === null || raw === undefined || raw === '';
    if (missing && !Number.isNaN(Number(f.value)) && f.value !== '') {
      return f.op === 'isNot';
    }
    const a = Number(raw);
    const b = Number(f.value);
    if (f.value === '' || Number.isNaN(b)) {
      return true;
    }
    switch (f.op) {
      case 'is':
        return a === b;
      case 'isNot':
        return a !== b;
      case 'gte':
        return a >= b;
      case 'lte':
        return a <= b;
      case 'gt':
        return a > b;
      case 'lt':
        return a < b;
      default:
        return true;
    }
  }
  const a = norm(raw);
  const b = norm(f.value);
  if (!b) {
    return true;
  }
  switch (f.op) {
    case 'is':
      return a === b;
    case 'isNot':
      return a !== b;
    case 'contains':
      return a.includes(b);
    case 'notContains':
      return !a.includes(b);
    default:
      return true;
  }
}

/** Every filter must hold (AND). */
export const applyFilters = <T extends object>(
  rows: readonly T[],
  filters: readonly Filter[],
  fields: readonly FilterField[],
): T[] => rows.filter(r => filters.every(f => matches(r as Row, f, fields)));

/** Stable; numbers by value, text without case, empty values always last. */
export function sortRows<T extends object>(
  rows: readonly T[],
  sort: Sort | null,
): T[] {
  if (!sort) {
    return [...rows];
  }
  const sign = sort.dir === 'asc' ? 1 : -1;
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      const a = (x.row as Row)[sort.key];
      const b = (y.row as Row)[sort.key];
      if (empty(a) || empty(b)) {
        return Number(empty(a)) - Number(empty(b)) || x.i - y.i;
      }
      const c =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a).localeCompare(String(b), undefined, { numeric: true });
      return c * sign || x.i - y.i;
    })
    .map(x => x.row);
}

/** State of one table: the sort, the filters and the pipeline over rows. */
export class TableQuery {
  readonly sort = signal<Sort | null>(null);
  readonly filters = signal<Filter[]>([]);

  constructor(
    readonly fields: readonly FilterField[],
    private readonly initial: Sort | null = null,
  ) {
    this.sort.set(initial);
  }

  /** asc, then desc, then back to the natural order. */
  toggle(key: string) {
    const s = this.sort();
    this.sort.set(
      !s || s.key !== key
        ? { key, dir: 'asc' }
        : s.dir === 'asc'
          ? { key, dir: 'desc' }
          : this.initial,
    );
  }

  add(filter: Filter) {
    this.filters.update(list => [...list, filter]);
  }
  remove(index: number) {
    this.filters.update(list => list.filter((_, i) => i !== index));
  }
  clear() {
    this.filters.set([]);
  }

  apply<T extends object>(rows: readonly T[]): T[] {
    return sortRows(
      applyFilters(rows, this.filters(), this.fields),
      this.sort(),
    );
  }
}
