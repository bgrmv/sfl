import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLAYERS, POSITIONS } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/** DUMMY (admin.wizard): six steps of the design; nothing is saved. The real form lives at /games/create. */
@Component({
  selector: 'sfl-admin-wizard-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.wizard'"
    >
      <sfl-page-head
        title="Game 47 · Saturday, 21 Nov"
        lead="Six steps: game, captains, draft, statistics, goal order, review."
      >
        <a
          sflBtn
          variant="ghost"
          routerLink="/games/create"
        >
          Open the working form
        </a>
      </sfl-page-head>
      <ol
        class="k-row"
        style="list-style:none;padding:0"
        aria-label="Steps"
      >
        @for (s of steps; track s; let i = $index) {
          <li>
            <button
              sflBtn
              size="sm"
              type="button"
              [variant]="i === step() ? 'primary' : 'ghost'"
              [attr.aria-current]="i === step() ? 'step' : null"
              (click)="step.set(i)"
            >
              {{ i + 1 }} · {{ s }}
            </button>
          </li>
        }
      </ol>
      <sfl-card
        flag="admin.wizard"
        [title]="steps[step()]"
      >
        @switch (step()) {
          @case (0) {
            <div class="k-grid">
              <div class="k-field">
                <label for="gd">Date</label>
                <input
                  id="gd"
                  class="k-input"
                  type="date"
                  value="2026-11-21"
                />
              </div>
              <div class="k-field">
                <label for="gn">Game number</label>
                <input
                  id="gn"
                  class="k-input"
                  value="47"
                />
              </div>
              <div class="k-field">
                <label for="gs">Season</label>
                <input
                  id="gs"
                  class="k-input"
                  value="2026"
                />
              </div>
            </div>
          }
          @case (1) {
            <div class="k-grid">
              @for (t of ['BMW · 1st draft', 'HONDA · 2nd draft']; track t) {
                <div class="k-callout">
                  <b class="k-head">{{ t }}</b>
                  <div class="k-field">
                    <label [for]="'c' + t">Change captain</label>
                    <select
                      [id]="'c' + t"
                      class="k-select"
                    >
                      @for (p of captains; track p.id) {
                        <option>{{ p.name }}</option>
                      }
                    </select>
                  </div>
                </div>
              }
            </div>
            <div class="k-row">
              <b>Who picks first</b>
              <sfl-segmented
                label="First pick"
                [options]="['Falcon (BMW)', 'Tank (HONDA)', 'Draw lots']"
                value="Draw lots"
              />
            </div>
          }
          @case (2) {
            <p class="k-muted">Pick 11 of 20. HONDA picks next.</p>
            <div class="k-grid">
              <div>
                <h3>Available players · 24</h3>
                <ul class="k-list">
                  @for (p of pool; track p.id) {
                    <li>
                      <b>{{ p.no }}</b>
                      <span class="k-grow">
                        {{ p.name }}
                        <span class="k-muted k-small">{{ p.pos }}</span>
                      </span>
                      <button
                        sflBtn
                        size="sm"
                        type="button"
                      >
                        + BMW
                      </button>
                      <button
                        sflBtn
                        size="sm"
                        variant="ghost"
                        type="button"
                      >
                        + HONDA
                      </button>
                    </li>
                  }
                </ul>
              </div>
              <div>
                <h3>BMW</h3>
                <ol class="k-small">
                  <li>Falcon (captain)</li>
                  <li>Lynx</li>
                </ol>
                <h3>HONDA</h3>
                <ol class="k-small">
                  <li>Wolf (captain)</li>
                  <li>Hawk</li>
                </ol>
              </div>
            </div>
          }
          @case (3) {
            <p class="k-callout">
              Echo (HONDA) has no position. Publishing is blocked until every
              player has one.
            </p>
            <table class="k-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Goals</th>
                  <th>Header</th>
                  <th>Passes</th>
                  <th>MVP</th>
                </tr>
              </thead>
              <tbody>
                @for (p of pool; track p.id) {
                  <tr>
                    <td>{{ p.no }}</td>
                    <td>{{ p.name }}</td>
                    <td>
                      <select
                        class="k-select"
                        style="width:150px"
                        [attr.aria-label]="'Position of ' + p.name"
                      >
                        @for (o of positions; track o.code) {
                          <option [selected]="o.name === p.pos">
                            {{ o.code }} · {{ o.name }}
                          </option>
                        }
                      </select>
                    </td>
                    <td>
                      <input
                        class="k-input"
                        style="width:60px"
                        type="number"
                        min="0"
                        value="0"
                        [attr.aria-label]="'Goals of ' + p.name"
                      />
                    </td>
                    <td>
                      <input
                        class="k-input"
                        style="width:60px"
                        type="number"
                        min="0"
                        value="0"
                        [attr.aria-label]="'Headers of ' + p.name"
                      />
                    </td>
                    <td>
                      <input
                        class="k-input"
                        style="width:60px"
                        type="number"
                        min="0"
                        value="0"
                        [attr.aria-label]="'Passes of ' + p.name"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        [attr.aria-label]="'MVP ' + p.name"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case (4) {
            <p class="k-muted">
              Each goal is three choices: which team scored, who scored, who
              passed or own goal. Statistics do not depend on the order.
            </p>
            <sfl-segmented
              label="Mode"
              [options]="['From totals', 'Live scorer', 'Skip, order unknown']"
              value="From totals"
            />
            <ol class="k-list">
              <li>
                <b class="k-num">0:0 → 1:0</b>
                BMW · Falcon (header)
              </li>
              <li>
                <b class="k-num">1:0 → 1:1</b>
                HONDA · Wolf · pass Tank
              </li>
              <li>
                <b class="k-num">1:1 → 2:1</b>
                BMW · Lynx · pass Otter
              </li>
            </ol>
            <p class="k-hint">
              Up to 3 passes per goal, all from the scoring team, none of them
              the scorer.
            </p>
          }
          @default {
            <h3>Checks</h3>
            <ul class="k-list">
              <li>✓ Both teams have players</li>
              <li>✓ Score matches goals</li>
              <li>✗ Echo (HONDA) has no position</li>
            </ul>
            <h3>What publishing changes</h3>
            <p class="k-small k-muted">
              After publishing the game counts in the ratings of the season and
              of the career. You can return it to a draft; the ratings are
              recalculated.
            </p>
            <div class="k-row">
              <button
                sflBtn
                variant="ghost"
                type="button"
              >
                Save as draft
              </button>
              <button
                sflBtn
                type="button"
                disabled
              >
                Publish game
              </button>
            </div>
          }
        }
        <div class="k-row k-between">
          <button
            sflBtn
            variant="ghost"
            type="button"
            [disabled]="step() === 0"
            (click)="step.set(step() - 1)"
          >
            ← Back
          </button>
          <button
            sflBtn
            type="button"
            [disabled]="step() === 5"
            (click)="step.set(step() + 1)"
          >
            Next: {{ next() }} →
          </button>
        </div>
      </sfl-card>
    </div>
  `,
})
export class AdminWizardPageComponent {
  protected readonly steps = [
    'Game',
    'Captains',
    'Draft',
    'Statistics',
    'Goal order',
    'Review',
  ];
  protected readonly step = signal(0);
  protected readonly next = computed(
    () => this.steps[Math.min(this.step() + 1, 5)],
  );
  protected readonly captains = PLAYERS.filter(p => p.captain);
  protected readonly pool = PLAYERS.slice(0, 6);
  protected readonly positions = POSITIONS;
}
