import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '@shared/ui/kit';
import { initials } from '../lib/player-stats';

/**
 * A player in a row or a list: avatar, name (a link when `playerId` is set),
 * the shirt number and a projected second line.
 */
@Component({
  selector: 'sfl-player-chip',
  imports: [AvatarComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .who {
      min-width: 0;
    }
    .sub {
      min-height: 1.5em;
      line-height: 1.5;
    }
  `,
  template: `
    <sfl-avatar
      [text]="ini()"
      [size]="size()"
      [accent]="accent()"
    />
    <span class="who">
      @if (playerId(); as id) {
        <a [routerLink]="['/players', id]">
          @if (bold()) {
            <b>{{ name() }}</b>
          } @else {
            {{ name() }}
          }
        </a>
      } @else if (bold()) {
        <b>{{ name() }}</b>
      } @else {
        {{ name() }}
      }
      <span class="sub k-muted k-small">
        @if (number()) {
          № {{ number() }}
        }
        <ng-content />
      </span>
    </span>
  `,
})
export class PlayerChipComponent {
  readonly name = input.required<string>();
  readonly playerId = input<string | null | undefined>(null);
  readonly number = input<number | null | undefined>(null);
  readonly size = input(32);
  readonly accent = input(false);
  readonly bold = input(false);

  protected readonly ini = computed(() => initials(this.name()));
}
