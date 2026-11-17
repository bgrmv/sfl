import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VOTES } from '@shared/dummy';
import { KIT } from '@shared/ui/kit';

/** DUMMY (vote.page): votes are made up (S10.35); the answer is kept only in the signal. */
@Component({
  selector: 'sfl-vote-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'vote.page'"
    >
      <sfl-page-head
        title="Vote"
        lead="New rules are adopted by the players. One vote per player; you can change it until the vote ends."
      >
        <a
          sflBtn
          routerLink="/suggest"
        >
          + Proposal or complaint
        </a>
      </sfl-page-head>
      <sfl-segmented
        label="Filter"
        [options]="['Open · 3', 'Adopted', 'Rejected']"
        value="Open · 3"
      />
      <div class="k-grid">
        @for (v of votes; track v.id) {
          <sfl-card
            flag="vote.page"
            [title]="v.title"
          >
            <div class="k-row">
              <sfl-badge [tone]="v.kind === 'Proposal' ? 'accent' : 'neg'">
                {{ v.kind }}
              </sfl-badge>
              <span class="k-muted k-small">{{ v.end }}</span>
            </div>
            <p class="k-small">{{ v.text }}</p>
            <sfl-split-bar
              [a]="v.y"
              [b]="v.n"
              aLabel="Yes"
              bLabel="No"
            />
            <div class="k-row">
              <button
                sflBtn
                size="sm"
                [variant]="answers()[v.id] === 'Yes' ? 'primary' : 'ghost'"
                type="button"
                (click)="answer(v.id, 'Yes')"
              >
                Yes
              </button>
              <button
                sflBtn
                size="sm"
                [variant]="answers()[v.id] === 'No' ? 'primary' : 'ghost'"
                type="button"
                (click)="answer(v.id, 'No')"
              >
                No
              </button>
              <span class="k-hint">Quorum: 10 votes</span>
            </div>
          </sfl-card>
        }
      </div>
      <p class="k-hint">
        A proposal is adopted when there are enough votes (quorum) and more
        “Yes” than “No”. Who may vote: players with a linked account and at
        least the minimum number of games.
      </p>
    </div>
  `,
})
export class VotePageComponent {
  protected readonly votes = VOTES;
  protected readonly answers = signal<Record<number, string>>(
    Object.fromEntries(VOTES.filter(v => v.mine).map(v => [v.id, v.mine])),
  );
  answer(id: number, a: string) {
    this.answers.update(s => ({ ...s, [id]: a }));
  }
}
