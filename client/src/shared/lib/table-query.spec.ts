import { describe, expect, it } from 'vitest';
import {
  TableQuery,
  applyFilters,
  sortRows,
  type FilterField,
} from './table-query';

const fields: FilterField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'goals', label: 'Goals', type: 'number' },
];
const rows = [
  { name: 'Anna', goals: 5 },
  { name: 'boris', goals: 12 },
  { name: 'Cleo', goals: 0 },
  { name: 'Dan', goals: null },
];

describe('sortRows', () => {
  it('sorts numbers by value, not as text', () => {
    expect(
      sortRows(rows, { key: 'goals', dir: 'asc' }).map(r => r.goals),
    ).toEqual([0, 5, 12, null]);
    expect(
      sortRows(rows, { key: 'goals', dir: 'desc' }).map(r => r.goals),
    ).toEqual([12, 5, 0, null]);
  });
  it('sorts text without case and keeps empty values last', () => {
    expect(
      sortRows(rows, { key: 'name', dir: 'asc' }).map(r => r.name),
    ).toEqual(['Anna', 'boris', 'Cleo', 'Dan']);
  });
  it('keeps the natural order without a sort and does not mutate', () => {
    expect(sortRows(rows, null)).toEqual(rows);
    sortRows(rows, { key: 'goals', dir: 'desc' });
    expect(rows[0].name).toBe('Anna');
  });
});

describe('applyFilters', () => {
  const run = (f: Parameters<typeof applyFilters>[1]) =>
    applyFilters(rows, f, fields).map(r => r.name);

  it('positive text filters', () => {
    expect(run([{ field: 'name', op: 'contains', value: 'AN' }])).toEqual([
      'Anna',
      'Dan',
    ]);
    expect(run([{ field: 'name', op: 'is', value: 'cleo' }])).toEqual(['Cleo']);
  });
  it('negative text filters', () => {
    expect(run([{ field: 'name', op: 'notContains', value: 'an' }])).toEqual([
      'boris',
      'Cleo',
    ]);
    expect(run([{ field: 'name', op: 'isNot', value: 'anna' }])).toEqual([
      'boris',
      'Cleo',
      'Dan',
    ]);
  });
  it('number filters, positive and negative', () => {
    expect(run([{ field: 'goals', op: 'gte', value: '5' }])).toEqual([
      'Anna',
      'boris',
    ]);
    expect(run([{ field: 'goals', op: 'lt', value: '5' }])).toEqual(['Cleo']);
    expect(run([{ field: 'goals', op: 'isNot', value: '5' }])).toEqual([
      'boris',
      'Cleo',
      'Dan',
    ]);
  });
  it('all filters must hold, an empty value filters nothing', () => {
    expect(
      run([
        { field: 'goals', op: 'gt', value: '0' },
        { field: 'name', op: 'notContains', value: 'b' },
      ]),
    ).toEqual(['Anna']);
    expect(run([{ field: 'name', op: 'contains', value: '' }])).toHaveLength(4);
  });
});

describe('TableQuery', () => {
  it('toggles asc, desc, then back to the natural order', () => {
    const q = new TableQuery(fields);
    q.toggle('goals');
    expect(q.sort()).toEqual({ key: 'goals', dir: 'asc' });
    q.toggle('goals');
    expect(q.sort()?.dir).toBe('desc');
    q.toggle('goals');
    expect(q.sort()).toBeNull();
  });
  it('returns to the initial sort', () => {
    const q = new TableQuery(fields, { key: 'goals', dir: 'desc' });
    q.toggle('name');
    q.toggle('name');
    q.toggle('name');
    expect(q.sort()).toEqual({ key: 'goals', dir: 'desc' });
  });
  it('filters and sorts in one call and removes a filter', () => {
    const q = new TableQuery(fields);
    q.add({ field: 'goals', op: 'gt', value: '0' });
    q.toggle('goals');
    expect(q.apply(rows).map(r => r.name)).toEqual(['Anna', 'boris']);
    q.remove(0);
    expect(q.apply(rows)).toHaveLength(4);
  });
});
