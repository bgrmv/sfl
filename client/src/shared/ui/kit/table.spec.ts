import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TableQuery } from '@shared/lib/table-query';
import { FilterBarComponent, SortHeaderComponent } from './table';

const q = () =>
  new TableQuery([
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'goals', label: 'Goals', type: 'number' },
  ]);

@Component({
  imports: [SortHeaderComponent, FilterBarComponent],
  template: `
    <table>
      <thead>
        <tr>
          <th
            sflSortKey="goals"
            [query]="query"
          >
            Goals
          </th>
        </tr>
      </thead>
    </table>
    <sfl-filter-bar [query]="query" />
  `,
})
class HostComponent {
  query = q();
}

describe('table kit', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('a header click sorts asc, desc and tells it with aria-sort', () => {
    const f = setup();
    const th = f.nativeElement.querySelector('th') as HTMLElement;
    const click = () => {
      th.querySelector('button')!.click();
      f.detectChanges();
    };
    expect(th.getAttribute('aria-sort')).toBe('none');
    click();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    click();
    expect(th.getAttribute('aria-sort')).toBe('descending');
    click();
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  it('adds a negative filter as a chip and removes it', () => {
    const f = setup();
    const el = f.nativeElement as HTMLElement;
    const selects = el.querySelectorAll('select');
    (selects[0] as HTMLSelectElement).value = 'name';
    selects[0].dispatchEvent(new Event('change'));
    f.detectChanges();
    const op = el.querySelectorAll('select')[1] as HTMLSelectElement;
    op.value = 'notContains';
    op.dispatchEvent(new Event('change'));
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'an';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();

    expect(f.componentInstance.query.filters()).toEqual([
      { field: 'name', op: 'notContains', value: 'an' },
    ]);
    expect(el.querySelector('.chip.neg')?.textContent).toContain(
      'does not contain',
    );
    (el.querySelector('.chip button') as HTMLButtonElement).click();
    expect(f.componentInstance.query.filters()).toEqual([]);
  });
});
