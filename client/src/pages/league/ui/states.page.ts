import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KIT } from '@shared/ui/kit';

/** Page not found, 404 of the design. */
@Component({
  selector: 'sfl-not-found-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      style="align-items:center;text-align:center;padding-top:64px"
    >
      <div
        class="k-head"
        style="font-size:96px;line-height:1;color:var(--sfl-accent)"
        aria-hidden="true"
      >
        4
        <sfl-icon
          name="ball"
          [size]="72"
        />
        4
      </div>
      <h1>Offside. No such page.</h1>
      <p class="k-muted">
        The link is old or the player was removed. Try the list.
      </p>
      <div class="k-row">
        <a
          sflBtn
          routerLink="/home"
        >
          Home
        </a>
        <a
          sflBtn
          variant="ghost"
          routerLink="/players"
        >
          All players
        </a>
      </div>
    </div>
  `,
})
export class NotFoundPageComponent {}

/** Gallery of block states: loading, empty, error (board "States"). */
@Component({
  selector: 'sfl-states-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        title="States"
        lead="Loading, empty and error states of a block."
      />
      <sfl-card title="1 · Loading (skeleton keeps the layout)">
        <sfl-state
          kind="loading"
          title="Loading player…"
        />
      </sfl-card>
      <sfl-card title="2 · Empty (new player)">
        <sfl-state
          title="No games yet"
          text="Numbers and charts appear after the first published game. The next Saturday is 21 Nov."
        >
          <a
            sflBtn
            variant="ghost"
            size="sm"
            href="/calendar"
          >
            See the schedule
          </a>
        </sfl-state>
      </sfl-card>
      <sfl-card title="3 · Error (the block fails, the page stays)">
        <sfl-state
          kind="error"
          title="Could not load the charts"
          text="The server did not answer. The numbers above are fine."
        >
          <button
            sflBtn
            size="sm"
            type="button"
          >
            Try again
          </button>
        </sfl-state>
      </sfl-card>
    </div>
  `,
})
export class StatesPageComponent {}
