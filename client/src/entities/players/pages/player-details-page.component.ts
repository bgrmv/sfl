import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlayerDetailsComponent } from '@entities/players/components/player-details/player-details.component';

@Component({
    selector: 'sfl-player-details-page',
    imports: [PlayerDetailsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <sfl-player-details />
  `,
    styles: `
    :host {
      display: block;
    }
  `
})
export class PlayerDetailsPageComponent {}
