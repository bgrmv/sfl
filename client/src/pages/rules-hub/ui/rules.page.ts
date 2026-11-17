import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RULE_SECTIONS } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/** DUMMY (rules.page): demo text based on the glossary; the final wording is the owner's. */
@Component({
  selector: 'sfl-rules-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'rules.page'"
    >
      <sfl-page-head
        title="Codex"
        lead="The rules of the league. Version 2026.3 · updated 1 Nov 2026 · every change is adopted by a vote of the players."
      >
        <button
          sflBtn
          variant="ghost"
          type="button"
        >
          Download PDF
        </button>
        <a
          sflBtn
          routerLink="/suggest"
        >
          Propose a change
        </a>
      </sfl-page-head>
      <div class="k-field">
        <label
          for="rs"
          class="k-visually-hidden"
        >
          Search the rules
        </label>
        <input
          id="rs"
          class="k-input"
          placeholder="Search the rules: “own goal”, “transfer”, “captain”…"
        />
      </div>
      <div class="k-grid-2">
        <div
          class="k-col"
          style="gap:var(--sfl-gap)"
        >
          @for (s of sections; track s.n) {
            <sfl-card
              flag="rules.page"
              [title]="s.n + '. ' + s.t"
            >
              @for (a of s.items; track a.no) {
                <article [id]="'a' + a.no">
                  <h3>{{ a.no }} {{ a.t }}</h3>
                  <p class="k-prose k-muted">{{ a.p }}</p>
                  <span class="k-hint">
                    Changed 1 Nov 2026 ·
                    <a
                      class="k-link"
                      routerLink="/vote"
                    >
                      history
                    </a>
                  </span>
                </article>
              }
            </sfl-card>
          }
        </div>
        <sfl-card title="Contents">
          <ol class="k-list">
            @for (s of sections; track s.n) {
              <li>
                <span class="k-head">{{ s.n }}</span>
                {{ s.t }}
              </li>
            }
          </ol>
        </sfl-card>
      </div>
    </div>
  `,
})
export class RulesPageComponent {
  protected readonly sections = RULE_SECTIONS;
}
