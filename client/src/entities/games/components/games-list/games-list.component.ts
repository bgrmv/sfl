import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GamesStore } from '../../store/games.store';
import { GameCardComponent } from '../game-card/game-card.component';

@Component({
    selector: 'sfl-games-list',
    imports: [GameCardComponent, MatProgressBarModule],
    templateUrl: './games-list.component.html',
    styleUrl: './games-list.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesListComponent {
  private readonly gamesStore = inject(GamesStore);

  protected readonly games = this.gamesStore.gamesEntities;
}
