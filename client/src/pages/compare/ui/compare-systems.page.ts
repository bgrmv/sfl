import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/** DUMMY (compare.systems): the table must be generated from @sfl/domain. */
@Component({
  selector: 'sfl-compare-systems-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'compare.systems'"
    >
      <sfl-page-head
        title="Two systems, side by side"
        lead="What is counted in each rating. Most of the points are the same; the difference is how the result of the game is rewarded."
      >
        <label class="k-check">
          <input
            type="checkbox"
            [checked]="onlyDiff()"
            (change)="onlyDiff.set(!onlyDiff())"
          />
          Show only differences
        </label>
      </sfl-page-head>
      <div class="k-grid">
        <sfl-card
          flag="compare.systems"
          title="Ancient (default)"
        >
          <p class="k-small">
            Points of the player only; the result of the game does not change
            them.
          </p>
          <a
            sflBtn
            variant="ghost"
            routerLink="/scoring"
          >
            Read how points work
          </a>
        </sfl-card>
        <sfl-card
          flag="compare.systems"
          title="Positional"
        >
          <p class="k-small">
            Adds a bonus or a penalty for the result, depending on the position.
          </p>
          <button
            sflBtn
            type="button"
            [disabled]="rating.system() === 'Positional'"
            (click)="rating.choose('Positional')"
          >
            {{
              rating.system() === 'Positional'
                ? 'Positional is in use'
                : 'Use the positional system'
            }}
          </button>
        </sfl-card>
      </div>
      <sfl-card flag="compare.systems">
        <table class="k-table">
          <caption class="k-visually-hidden">
            Metrics of the two rating systems
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Tag</th>
              <th class="r">Ancient</th>
              <th class="r">Positional</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.t) {
              <tr>
                <td>{{ r.t }}</td>
                <td>
                  <sfl-badge [tone]="r.same ? 'muted' : 'accent'">
                    {{ r.same ? 'same' : 'differs' }}
                  </sfl-badge>
                </td>
                <td class="r">{{ r.a }}</td>
                <td class="r">{{ r.b }}</td>
              </tr>
            }
          </tbody>
        </table>
      </sfl-card>
      <sfl-card
        flag="compare.systems"
        title="Try it: the same game in both systems"
      >
        <p>
          A defender gave
          <b>1 pass</b>
          , no goals. His team
          <b>won</b>
          .
        </p>
        <div class="k-grid-sm">
          <sfl-stat
            label="Ancient"
            [value]="1"
          />
          <sfl-stat
            label="Positional"
            [value]="4"
            [accent]="true"
          />
        </div>
        <p class="k-hint">
          A defender who only gave one pass earns 1 point in the ancient system,
          and 4 in the positional one after a win. After a loss it would be −3.
        </p>
      </sfl-card>
    </div>
  `,
})
export class CompareSystemsPageComponent {
  protected readonly rating = inject(RatingSystemStore);
  protected readonly onlyDiff = signal(false);
  private readonly all = [
    { t: 'Goal', a: '+1', b: '+1', same: true },
    { t: 'Header', a: '×2', b: '×2', same: true },
    { t: 'Pass', a: '+1', b: '+1', same: true },
    { t: 'Own goal', a: '−1', b: '−1', same: true },
    { t: 'Win (defender)', a: '0', b: '+3', same: false },
    { t: 'Loss (defender)', a: '0', b: '−3', same: false },
    { t: 'Win (goalkeeper)', a: '0', b: '+4', same: false },
  ];
  protected readonly rows = () =>
    this.all.filter(r => !this.onlyDiff() || !r.same);
}
