import { Signal, computed } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/**
 * The data source of a Material table as a pure function of the rows and of the
 * `MatSort` of the view (`viewChild(MatSort)`): no effect copies the state of a store.
 */
export function sortedTableSource<T>(
  rows: Signal<readonly T[]>,
  sort: Signal<MatSort | undefined>,
): Signal<MatTableDataSource<T>> {
  return computed(() => {
    const source = new MatTableDataSource<T>([...rows()]);
    source.sort = sort() ?? null;
    return source;
  });
}
