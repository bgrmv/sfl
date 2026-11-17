import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AvatarComponent } from '@shared/ui/kit';
import { initials } from '../lib/player-stats';

/**
 * A player at the top of a page or a card: large avatar, heading, a line of
 * facts (default slot), an optional eyebrow above the heading
 * (`header-eyebrow`) and an aside on the right (`header-aside`).
 */
@Component({
  selector: 'sfl-player-header',
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .main {
      flex: 1 1 200px;
      min-width: 0;
    }
    .facts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .aside {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
  `,
  template: `
    <sfl-avatar
      [text]="ini()"
      [size]="size()"
      [accent]="accent()"
    />
    <div class="main">
      <ng-content select="[header-eyebrow]" />
      @if (level() === 1) {
        <h1>{{ name() }}</h1>
      } @else {
        <h2>{{ name() }}</h2>
      }
      <div class="facts k-muted k-small">
        <ng-content />
      </div>
    </div>
    <div class="aside">
      <ng-content select="[header-aside]" />
    </div>
  `,
})
export class PlayerHeaderComponent {
  readonly name = input.required<string>();
  readonly size = input<56 | 96>(56);
  readonly accent = input(false);
  readonly level = input<1 | 2>(2);

  protected readonly ini = computed(() => initials(this.name()));
}
