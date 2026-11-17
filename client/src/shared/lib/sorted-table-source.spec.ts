import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { describe, expect, it } from 'vitest';
import { sortedTableSource } from './sorted-table-source';

@Component({
  imports: [MatSortModule],
  template: `
    <table matSort></table>
  `,
})
class HostComponent {
  readonly rows = signal([{ n: 2 }, { n: 1 }]);
  readonly sort = viewChild(MatSort);
  readonly source = sortedTableSource(this.rows, this.sort);
}

describe('sortedTableSource', () => {
  it('holds the rows and follows them', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    expect(host.source().data).toEqual([{ n: 2 }, { n: 1 }]);
    host.rows.set([{ n: 5 }]);
    expect(host.source().data).toEqual([{ n: 5 }]);
  });

  it('takes the sort of the table as soon as the view has it', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    expect(host.sort()).toBeTruthy();
    expect(host.source().sort).toBe(host.sort());
  });

  it('works before the view exists: no sort, the rows are there', () => {
    const rows = signal([{ n: 1 }]);
    const source = TestBed.runInInjectionContext(() =>
      sortedTableSource(rows, signal(undefined)),
    );

    expect(source().data).toEqual([{ n: 1 }]);
    expect(source().sort).toBeNull();
  });
});
