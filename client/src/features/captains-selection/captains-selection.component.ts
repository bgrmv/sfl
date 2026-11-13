import { CardVariantEnum } from '@shared/constants/card';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { map } from 'rxjs/operators';

import { CaptainStatsCardComponent, CaptainsStore } from '@entities/captains';
import { BaseUnsubscribeComponent } from '@shared/classes/base-unsubscribe-component';
import { TeamEnum } from '@shared/constants/team';
import { MatButtonModule } from '@angular/material/button';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'sfl-captains-selection',
  templateUrl: './captains-selection.component.html',
  styleUrls: ['./captains-selection.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [MatButtonModule, CaptainStatsCardComponent, AsyncPipe, JsonPipe],
})
export class CaptainsSelectionComponent extends BaseUnsubscribeComponent {
  private captainsStore = inject(CaptainsStore);

  readonly team = input.required<TeamEnum>();
  readonly control = input.required<FormControl<boolean | null>>();

  readonly cardVariantEnum = CardVariantEnum;
  readonly captains$ = this.captainsStore.captains$;
  readonly captainsWithoutTeam$ = this.captainsStore.captainsWithoutTeam$;

  readonly selectedCaptain$ = this.captainsStore.selectedCaptains$.pipe(
    map(selected => selected.filter(select => select.team === this.team())),
    map(selected => selected[0] ?? null),
  );

  @HostListener('click', ['$event.target'])
  handleClick(target: EventTarget | null) {
    const captainEl = (target as Element | null)?.closest(
      'sfl-captain-stats-card',
    );
    if (!captainEl) {
      return;
    }

    const id = captainEl.getAttribute('data-captain-id');
    id && this.captainsStore.addSelected({ id, team: this.team() });
    this.control().patchValue(true);
  }

  deleteSelected(id: string) {
    this.captainsStore.deleteSelected(id);
    this.control().patchValue(false);
  }
}
