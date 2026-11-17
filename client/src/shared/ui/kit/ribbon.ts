import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type RibbonState = 'played' | 'draft' | 'next' | 'future' | 'missed';

export interface RibbonCell {
  number: number;
  /** Short date, for the title and the screen reader. */
  date: string;
  state: RibbonState;
  /** `4:1` of a played game. */
  score: string | null;
  /** Short name of the winner, `=` for a draw. */
  mark: string;
  link: string | null;
}

const STATE_TEXT: Record<RibbonState, string> = {
  played: 'played',
  draft: 'draft, not published',
  next: 'next game',
  future: 'planned',
  missed: 'no record',
};

/**
 * "Ribbon of Saturdays": the whole season in one strip, a cell per Saturday
 * (docs/design/flip-board-and-ribbon.md). The state is always written, never colour alone.
 */
@Component({
  selector: 'sfl-season-ribbon',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 4px;
    }
    .cell {
      min-height: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      border-radius: var(--sfl-radius);
      border: 1px solid var(--sfl-border);
      font-size: 11px;
      line-height: 1.15;
      color: var(--sfl-muted);
      text-align: center;
    }
    a.cell:hover {
      border-color: var(--sfl-accent);
      text-decoration: none;
    }
    .n {
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    .s {
      font: 700 14px var(--sfl-font-head);
      color: var(--sfl-text);
      font-variant-numeric: tabular-nums;
    }
    .played {
      background: var(--sfl-surface-2);
      border-color: transparent;
    }
    .draft {
      border-style: dashed;
      border-color: var(--sfl-accent);
    }
    .next {
      background: var(--sfl-accent);
      border-color: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    .next .s {
      color: var(--sfl-on-accent);
    }
    .future {
      border-style: dashed;
    }
    .missed {
      opacity: 0.6;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--sfl-muted);
    }
  `,
  template: `
    <ol [attr.aria-label]="label()">
      @for (c of cells(); track c.number) {
        <li>
          @if (c.link) {
            <a
              class="cell"
              [class]="c.state"
              [routerLink]="c.link"
              [attr.aria-label]="text(c)"
              [title]="text(c)"
            >
              <span class="n">{{ c.number }}</span>
              <span class="s">{{ c.score ?? '···' }}</span>
              <span>{{ c.mark }}</span>
            </a>
          } @else {
            <span
              class="cell"
              [class]="c.state"
              [attr.aria-label]="text(c)"
              [title]="text(c)"
            >
              <span class="n">{{ c.number }}</span>
              <span class="s">{{ c.state === 'next' ? 'SAT' : '' }}</span>
              <span>{{ c.mark }}</span>
            </span>
          }
        </li>
      }
    </ol>
    <div class="legend">
      <span>Score and winner: played</span>
      <span>Dashed accent: draft</span>
      <span>Accent: next game</span>
      <span>Dashed: planned</span>
      <span>Dim: no record</span>
    </div>
  `,
})
export class SeasonRibbonComponent {
  readonly cells = input.required<readonly RibbonCell[]>();
  readonly label = input('Saturdays of the season');
  protected text(c: RibbonCell): string {
    return `Game ${c.number}, ${c.date}: ${
      c.score
        ? `${c.score}, ${c.mark === '=' ? 'draw' : c.mark + ' won'}`
        : STATE_TEXT[c.state]
    }${c.state === 'draft' ? ' (draft)' : ''}`;
  }
}
