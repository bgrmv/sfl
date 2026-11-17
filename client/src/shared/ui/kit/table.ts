import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { ButtonDirective } from './primitives';
import {
  OPS,
  OP_LABEL,
  TableQuery,
  type FilterOp,
} from '@shared/lib/table-query';

/**
 * Sortable column header: `<th sflSortKey="goals" [query]="q" class="r">Goals</th>`.
 * A click goes asc, desc, natural order; `aria-sort` tells it to a screen reader.
 */
@Component({
  // An attribute on <th> keeps the table markup valid and puts aria-sort on the header cell
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'th[sflSortKey]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    button {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      color: inherit;
    }
    button:hover {
      color: var(--sfl-text);
    }
    button:focus-visible {
      outline: 2px solid var(--sfl-accent);
      outline-offset: 2px;
    }
    .arrow {
      font-size: 10px;
      width: 10px;
      color: var(--sfl-accent);
    }
  `,
  host: { '[attr.aria-sort]': 'ariaSort()' },
  template: `
    <button
      type="button"
      (click)="query().toggle(sflSortKey())"
    >
      <ng-content />
      <span
        class="arrow"
        aria-hidden="true"
      >
        {{ arrow() }}
      </span>
    </button>
  `,
})
export class SortHeaderComponent {
  readonly sflSortKey = input.required<string>();
  readonly query = input.required<TableQuery>();
  private readonly dir = computed(() => {
    const s = this.query().sort();
    return s?.key === this.sflSortKey() ? s.dir : null;
  });
  protected readonly arrow = computed(() =>
    this.dir() === 'asc' ? '▲' : this.dir() === 'desc' ? '▼' : '',
  );
  protected readonly ariaSort = computed(() =>
    this.dir() === 'asc'
      ? 'ascending'
      : this.dir() === 'desc'
        ? 'descending'
        : 'none',
  );
}

/**
 * Filters of a table, positive and negative: `Position is not GK`, `Goals ≥ 5`.
 * All filters must hold. The state lives in the page's `TableQuery`.
 */
@Component({
  selector: 'sfl-filter-bar',
  imports: [ButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    select,
    input {
      min-height: 36px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 4px 2px 10px;
      border-radius: var(--sfl-radius-pill);
      border: 1px solid var(--sfl-border);
      font-size: 13px;
      background: var(--sfl-surface-2);
    }
    .chip.neg {
      border-color: var(--sfl-neg);
    }
    .chip button {
      all: unset;
      cursor: pointer;
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .chip button:focus-visible {
      outline: 2px solid var(--sfl-accent);
    }
  `,
  template: `
    <form
      class="k-row"
      role="search"
      aria-label="Table filters"
      (submit)="add($event)"
    >
      <select
        class="k-select"
        style="width: auto"
        aria-label="Filter column"
        (change)="pickField($any($event.target).value)"
      >
        @for (f of query().fields; track f.key) {
          <option [value]="f.key">{{ f.label }}</option>
        }
      </select>
      <select
        class="k-select"
        style="width: auto"
        aria-label="Filter condition"
        (change)="op.set($any($event.target).value)"
      >
        @for (o of ops(); track o) {
          <option
            [value]="o"
            [selected]="o === op()"
          >
            {{ label(o) }}
          </option>
        }
      </select>
      <input
        class="k-input"
        style="width: 160px"
        aria-label="Filter value"
        [type]="type() === 'number' ? 'number' : 'text'"
        placeholder="value"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
      />
      <button
        sflBtn
        size="sm"
        type="submit"
        [disabled]="value() === ''"
      >
        Add filter
      </button>
      @if (query().filters().length) {
        <button
          sflBtn
          size="sm"
          variant="ghost"
          type="button"
          (click)="query().clear()"
        >
          Clear all
        </button>
      }
    </form>
    @if (query().filters().length) {
      <ul
        class="k-row"
        style="list-style: none; padding: 0; margin: 8px 0 0"
        aria-label="Active filters"
      >
        @for (f of query().filters(); track $index) {
          <li
            class="chip"
            [class.neg]="isNegative(f.op)"
          >
            {{ fieldLabel(f.field) }} {{ label(f.op) }}
            <b>{{ f.value }}</b>
            <button
              type="button"
              [attr.aria-label]="'Remove filter ' + fieldLabel(f.field)"
              (click)="query().remove($index)"
            >
              ×
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class FilterBarComponent {
  readonly query = input.required<TableQuery>();
  protected readonly field = signal('');
  protected readonly op = signal<FilterOp | ''>('');
  protected readonly value = signal('');

  private readonly current = computed(
    () =>
      this.query().fields.find(f => f.key === this.field()) ??
      this.query().fields[0],
  );
  protected readonly type = computed(() => this.current().type);
  protected readonly ops = computed(() => OPS[this.type()]);
  protected readonly label = (o: FilterOp) => OP_LABEL[o];
  protected readonly isNegative = (o: FilterOp) =>
    o === 'isNot' || o === 'notContains' || o === 'lt' || o === 'gt';
  protected readonly fieldLabel = (key: string) =>
    this.query().fields.find(f => f.key === key)?.label ?? key;

  protected pickField(key: string) {
    this.field.set(key);
    this.op.set('');
  }

  protected add(event: Event) {
    event.preventDefault();
    const op = this.ops().includes(this.op() as FilterOp)
      ? (this.op() as FilterOp)
      : this.ops()[0];
    if (this.value() === '') {
      return;
    }
    this.query().add({ field: this.current().key, op, value: this.value() });
    this.value.set('');
  }
}

/** Sort control for card views, where there are no column headers. */
@Component({
  selector: 'sfl-sort-select',
  imports: [ButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="k-label"
      for="sort-by"
    >
      Sort by
    </label>
    <select
      id="sort-by"
      class="k-select"
      style="width: auto; min-height: 36px"
      (change)="pick($any($event.target).value)"
    >
      <option
        value=""
        [selected]="!query().sort()"
      >
        Default
      </option>
      @for (f of query().fields; track f.key) {
        <option
          [value]="f.key"
          [selected]="query().sort()?.key === f.key"
        >
          {{ f.label }}
        </option>
      }
    </select>
    @if (query().sort(); as s) {
      <button
        sflBtn
        size="sm"
        variant="ghost"
        type="button"
        [attr.aria-label]="s.dir === 'asc' ? 'Ascending' : 'Descending'"
        (click)="flip()"
      >
        {{ s.dir === 'asc' ? '▲' : '▼' }}
      </button>
    }
  `,
  host: { class: 'k-row' },
})
export class SortSelectComponent {
  readonly query = input.required<TableQuery>();
  protected pick(key: string) {
    this.query().sort.set(key ? { key, dir: 'desc' } : null);
  }
  protected flip() {
    const s = this.query().sort();
    if (s) {
      this.query().sort.set({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' });
    }
  }
}
