import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KIT } from '@shared/ui/kit';

/** DUMMY (history.page): placeholders only: the texts are written by the owner (S10.24). */
@Component({
  selector: 'sfl-history-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'history.page'"
    >
      <sfl-page-head
        title="History of the league"
        lead="[Lead paragraph from the owner: how the league started and who plays it.]"
      />
      <div class="k-grid-sm">
        @for (f of facts; track f.l) {
          <sfl-stat
            [label]="f.l"
            [value]="f.v"
          />
        }
      </div>
      <div class="k-row">
        @for (d of decades; track d) {
          <sfl-badge>{{ d }}</sfl-badge>
        }
      </div>
      @for (y of years; track y) {
        <sfl-card
          flag="history.page"
          [title]="y"
        >
          <p class="k-prose k-muted">
            [{{ y }}: text of the entry from the owner. Names, places and
            nicknames are written by the owner, nothing is invented here.]
          </p>
          <div
            role="img"
            aria-label="Archive photo placeholder"
            style="aspect-ratio:16/6;background:var(--sfl-surface-2);border-radius:4px"
          ></div>
          <span class="k-hint">[Caption with names]</span>
        </sfl-card>
      }
      <sfl-card
        flag="history.page"
        title="Records from the data"
      >
        <p class="k-small k-muted">
          Filled in from the statistics of published games: most points in a
          season, most games in a row, the best streak of wins.
        </p>
      </sfl-card>
    </div>
  `,
})
export class HistoryPageComponent {
  protected readonly facts = [
    { l: 'Years', v: '46' },
    { l: 'Saturdays', v: '2 400+' },
    { l: 'Players ever', v: '210' },
    { l: 'Statistics since', v: '2011' },
  ];
  protected readonly decades = ['1980s', '1990s', '2000s', '2010s', '2020s'];
  protected readonly years = ['1980', '1995', '2011', '2026'];
}
