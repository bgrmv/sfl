import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MatExpansionModule } from '@angular/material/expansion';
import { EnumGameMode } from '@entities/games/constants';
import { NewGameStore } from '@entities/games/store/new-game.store';
import { TTeamFinal } from '@entities/games/types';
import { PlayersAutocompleteComponent } from '@entities/players/components/players-autocomplete/players-autocomplete.component';
import { GameCreatePlayerStatisticsComponent } from '../game-create-player-statistics/game-create-player-statistics.component';

@Component({
  selector: 'sfl-game-team-create',
  imports: [
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    GameCreatePlayerStatisticsComponent,
    PlayersAutocompleteComponent,
  ],
  templateUrl: './game-team-create.component.html',
  styleUrl: './game-team-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTeamCreateComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly newGameStore = inject(NewGameStore);

  public readonly idx = input.required<number>();
  public readonly team = input.required<TTeamFinal>();
  public readonly mode = input.required<EnumGameMode>();
  public readonly teamId = computed(() => this.team().id);

  /**
   * https://stackblitz.com/edit/angular-sx79hu?embed=1&file=app/multiselect-autocomplete-example.html
   * https://stackoverflow.com/questions/49131094/is-there-a-way-to-make-a-multiselection-in-autocomplete-angular4
   * https://stackblitz.com/run?file=src%2Fexample%2Fchips-autocomplete-example.html
   * https://material.angular.io/components/chips/examples
   */

  protected readonly noteFC = new FormControl<string>('', {
    nonNullable: true,
  });

  ngOnInit(): void {
    const { notes } = this.newGameStore.game();
    this.noteFC.setValue(notes[this.idx()]);

    this.noteFC.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(note => {
        const { notes } = this.newGameStore.game();
        notes[this.idx()] = note;
        this.newGameStore.updateGameFields({
          notes,
        });
      });
  }
}
