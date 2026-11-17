import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POSITIONS } from '@shared/dummy';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/** DUMMY (scoring.page): texts mirror GLOSSARY.md; the numbers must come from @sfl/domain. */
@Component({
  selector: 'sfl-scoring-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'scoring.page'"
    >
      <sfl-page-head
        title="How points work"
        [lead]="
          'Two rating systems live side by side. Showing the ' +
          system() +
          ' system, chosen in the header.'
        "
      >
        <a
          sflBtn
          variant="ghost"
          routerLink="/compare/systems"
        >
          Compare both side by side
        </a>
      </sfl-page-head>

      <sfl-card
        flag="scoring.page"
        title="What gives points"
      >
        <div class="k-grid-sm">
          @for (e of events; track e.t) {
            <sfl-stat
              [label]="e.t"
              [value]="e.v"
              [sub]="e.s"
            />
          }
        </div>
      </sfl-card>

      @if (system() === 'Positional') {
        <sfl-card
          flag="scoring.page"
          title="Bonus for the result, by position"
        >
          <p class="k-small k-muted">
            A win adds the number, a loss subtracts it, a draw changes nothing.
            The positions that score less get a bigger bonus.
          </p>
          <table class="k-table">
            <caption class="k-visually-hidden">Bonus by position</caption>
            <thead>
              <tr>
                <th>Position</th>
                <th class="r">Win</th>
                <th class="r">Draw</th>
                <th class="r">Loss</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              @for (p of positions; track p.code) {
                <tr>
                  <td>
                    <sfl-icon [name]="p.icon" />
                    {{ p.name }}
                  </td>
                  <td class="r">{{ p.win }}</td>
                  <td class="r">0</td>
                  <td class="r">{{ p.loss }}</td>
                  <td class="k-muted">{{ p.idea }}</td>
                </tr>
              }
            </tbody>
          </table>
        </sfl-card>
      }

      <sfl-card
        flag="scoring.page"
        title="Worked example"
      >
        <table class="k-table">
          <caption class="k-visually-hidden">Worked example</caption>
          <thead>
            <tr>
              <th>Player</th>
              <th>What he did</th>
              <th class="r">Points</th>
              <th>Result</th>
              <th class="r">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Forward</td>
              <td>2 goals, 1 header</td>
              <td class="r">4</td>
              <td>Win</td>
              <td class="r">{{ system() === 'Positional' ? 5 : 4 }}</td>
            </tr>
            <tr>
              <td>Defender</td>
              <td>1 pass</td>
              <td class="r">1</td>
              <td>Win</td>
              <td class="r">{{ system() === 'Positional' ? 4 : 1 }}</td>
            </tr>
          </tbody>
        </table>
      </sfl-card>

      <sfl-card
        flag="scoring.page"
        title="Where the numbers come from"
      >
        <ol class="k-small">
          <li>
            The administrator fills in the game and two admins confirm it.
          </li>
          <li>A published game is added to the ratings.</li>
          <li>
            Statistics are recalculated; a revoked game leaves the ratings.
          </li>
        </ol>
        <a
          class="k-link"
          routerLink="/rules"
        >
          Read the rules
        </a>
      </sfl-card>
    </div>
  `,
})
export class ScoringPageComponent {
  protected readonly positions = POSITIONS;
  protected readonly system = inject(RatingSystemStore).system;
  protected readonly events = [
    { t: 'Goal', v: '+1', s: 'and +1 on the score' },
    { t: 'Header', v: '×2', s: 'counts double' },
    { t: 'Penalty', v: '+1', s: '' },
    { t: 'Pass', v: '+1', s: 'for the passer' },
    { t: 'Own goal', v: '−1', s: 'counts for the opponent' },
  ];
}
