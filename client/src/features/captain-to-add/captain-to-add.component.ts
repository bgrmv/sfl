import { AsyncPipe, JsonPipe } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';

import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  startWith,
  takeUntil,
  tap,
} from 'rxjs';

import {
  CaptainCardComponent,
  CaptainsCardsComponent,
  CaptainsStore,
  TCaptain,
} from 'src/entities/captains';

import { toObservable } from '@angular/core/rxjs-interop';
import { CardVariantEnum } from '@shared/constants/card';
import { PlayersStore } from 'src/entities/players';
import { PlayerClient } from 'src/entities/players/types';
import { BaseUnsubscribeComponent } from 'src/shared/classes/base-unsubscribe-component';
import { displayFn } from '../../entities/captains/utils/autocomplete';

@Component({
  selector: 'sfl-captain-to-add',
  templateUrl: './captain-to-add.component.html',
  styleUrls: ['./captain-to-add.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    MatRadioModule,
    FormsModule,
    JsonPipe,
    AsyncPipe,
    MatStepperModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    CaptainCardComponent,
    CaptainsCardsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaptainToAddComponent
  extends BaseUnsubscribeComponent
  implements OnInit
{
  private captainsStore = inject(CaptainsStore);

  readonly playersStore = inject(PlayersStore);

  readonly displayFn = displayFn;
  readonly variantEnum = CardVariantEnum;
  readonly players$ = toObservable(this.playersStore.players);
  readonly captains$ = this.captainsStore.captains$;
  readonly captainFormControl = new FormControl<TCaptain | string | null>('');

  readonly #filteredPlayers = new BehaviorSubject<PlayerClient[]>([]);
  readonly filteredPlayers$ = this.#filteredPlayers.asObservable();

  readonly loading$ = new Subject();

  @HostListener('click', ['$event.target'])
  handleClick(target: Element) {
    const captainEl = target.closest('sfl-captain-card');
    if (!captainEl) {
      return;
    }
    const id = captainEl.getAttribute('data-captain-id');
    id && this.captainsStore.delete(id);
  }

  ngOnInit() {
    combineLatest([
      this.players$,
      this.captainsStore.captains$,
      this.captainFormControl.valueChanges.pipe(startWith(null)),
    ])
      .pipe(
        tap(() => this.loading$.next(true)),
        debounceTime(1500),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(([, , suggestedCaptain]) => {
        this.loading$.next(false);

        if (!suggestedCaptain) {
          // return this.#filteredPlayers.next(players);
        }

        // Todo [API]: in the future it should use API
        if (typeof suggestedCaptain === 'string') {
          // TODO
          // return this.#filteredPlayers.next(
          //   players.filter(
          //     player =>
          //       !captainsIds.includes(player.id) &&
          //       hasSuggestedFilter(player, suggestedCaptain),
          //   ),
          // );
        }

        // Todo [API]: in the future it should use API
        this.captainFormControl.reset();
        // this.captainsStore.add({
        //   ...suggestedCaptain,
        //   isCaptain: true,
        // });
      });
  }
}
