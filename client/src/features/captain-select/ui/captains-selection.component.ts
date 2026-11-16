import { CardVariantEnum } from '@shared/constants/card';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
} from '@angular/core';
import { JsonPipe } from '@angular/common';

import { CaptainStatsCardComponent, CaptainsStore } from '@entities/captain';
import { PlayersStore } from '@entities/player';
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
  imports: [MatButtonModule, CaptainStatsCardComponent, JsonPipe],
})
export class CaptainsSelectionComponent extends BaseUnsubscribeComponent {
  private captainsStore = inject(CaptainsStore);
  private playersStore = inject(PlayersStore);

  readonly team = input.required<TeamEnum>();
  readonly control = input.required<FormControl<boolean | null>>();

  readonly cardVariantEnum = CardVariantEnum;
  readonly captains = this.playersStore.captains;
  readonly captainsWithoutTeam = computed(() => {
    const selectedIds = this.captainsStore.selected().map(({ id }) => id);
    return this.captains().filter(({ id }) => !selectedIds.includes(id));
  });

  readonly selectedCaptain = computed(() => {
    const team = this.team();
    const selected = this.captainsStore
      .selected()
      .find(select => select.team === team);
    const captain = this.captains().find(({ id }) => id === selected?.id);
    return captain && selected ? { ...captain, team } : null;
  });

  @HostListener('click', ['$event.target'])
  handleClick(target: EventTarget | null) {
    const captainEl = (target as Element | null)?.closest(
      'sfl-captain-stats-card',
    );
    if (!captainEl) {
      return;
    }

    const id = captainEl.getAttribute('data-captain-id');
    if (id && this.captains().some(captain => captain.id === id)) {
      this.captainsStore.addSelected({ id, team: this.team() });
      this.control().patchValue(true);
    }
  }

  deleteSelected(id: string) {
    this.captainsStore.deleteSelected(id);
    this.control().patchValue(false);
  }
}
