import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

/** A player the user can pick; the feature knows nothing about games or stores. */
export interface PlayerOption {
  id: string;
  nickname: string;
  number?: number;
  name?: string;
  surname?: string;
  /** Already picked (shown as a chip and checked in the list). */
  selected: boolean;
}

/** Search by nickname, name, surname or number. */
export function filterPlayerOptions(
  options: PlayerOption[],
  query: string,
): PlayerOption[] {
  const text = query.toLowerCase().trim();
  if (!text) {
    return options;
  }
  return options.filter(
    option =>
      option.name?.toLowerCase().includes(text) ||
      option.surname?.toLowerCase().includes(text) ||
      option.nickname.toLowerCase().includes(text) ||
      option.number?.toString().includes(text),
  );
}

/**
 * Chips with an autocomplete list of players. The parent owns the data:
 * it passes `options` and listens to `picked`, `removed` and `createRequested`.
 */
@Component({
  selector: 'sfl-players-autocomplete',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './players-autocomplete.component.html',
  styleUrl: './players-autocomplete.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayersAutocompleteComponent {
  public readonly options = input.required<PlayerOption[]>();

  /** The user checked a player in the list. */
  public readonly picked = output<string>();
  /** The user removed a chip or unchecked a player. */
  public readonly removed = output<string>();
  public readonly createRequested = output<void>();

  protected readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  protected readonly query = signal('');

  protected readonly chips = computed(() =>
    this.options().filter(option => option.selected),
  );
  protected readonly filteredOptions = computed(() =>
    filterPlayerOptions(this.options(), this.query()),
  );

  protected remove(id: string): void {
    this.query.set('');
    this.removed.emit(id);
  }

  protected onSelect(event: MatSelectionListChange): void {
    const option = event.options.at(0);
    const value = option?.value as PlayerOption | undefined;
    if (!option || !value) {
      return;
    }
    this.query.set('');

    if (option.selected) {
      this.picked.emit(value.id);
    } else {
      this.removed.emit(value.id);
    }
  }
}
