import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { GameService } from '@entities/games';
import { GamesListComponent } from '@entities/games/components/games-list/games-list.component';
import { GamesStore } from '@entities/games/store/games.store';
import { PageComponent } from '@shared/ui/core/page/page.component';

@Component({
    selector: 'sfl-games-page',
    imports: [
        // Material
        FormsModule,
        MatDividerModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatSelectModule,
        // Component
        PageComponent,
        GamesListComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
    .actions {
      display: flex;
      align-items: center;
      justify-content: end;
      padding: 0;
    }
  `,
    template: `
    <sfl-page title="games">
      <div>
        <div class="actions">
          <mat-form-field appearance="outline">
            <mat-label>Season</mat-label>
            <mat-select [(ngModel)]="season">
              <mat-option [value]="2023">2023</mat-option>
              <mat-option [value]="2024">2024</mat-option>
              <mat-option [value]="2025">2025</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        <sfl-games-list />
      </div>
    </sfl-page>
  `,
    providers: [GameService, GamesStore]
})
export class GamesPageComponent implements OnInit {
  private readonly gamesStore = inject(GamesStore);

  readonly season = signal(new Date().getFullYear());
  protected readonly loading = this.gamesStore.loading;

  private readonly seasonChangeObseravbale = toObservable(this.season).pipe(
    takeUntilDestroyed(),
  );

  ngOnInit(): void {
    this.seasonChangeObseravbale.subscribe(season => {
      this.gamesStore.initGamesStore({ season });
    });
  }
}
