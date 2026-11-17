import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerChipComponent } from './player-chip.component';

/**
 * A rating card: the player on the left, the main number on the right, a line
 * of details below (default slot), an accent bar on the left. A badge next to
 * the name goes into `card-badge`.
 */
@Component({
  selector: 'sfl-rating-card',
  imports: [PlayerChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .value {
      font-size: 28px;
    }
    .details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `,
  template: `
    <div class="k-callout details">
      <div class="top">
        <span class="who">
          @if (rank() !== null) {
            <b class="rank k-head">{{ rank() }}.</b>
          }
          <sfl-player-chip
            [name]="name()"
            [playerId]="playerId()"
            [bold]="true"
          />
          <ng-content select="[card-badge]" />
        </span>
        <b class="value k-head">{{ value() }}</b>
      </div>
      <ng-content />
    </div>
  `,
})
export class RatingCardComponent {
  readonly name = input.required<string>();
  readonly value = input.required<string | number>();
  readonly playerId = input<string | null | undefined>(null);
  readonly rank = input<number | null>(null);
}
