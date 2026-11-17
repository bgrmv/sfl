import { EnumGameMode } from './game-mode';
import type { LeaseState } from './game-lease';

/** The pause after the last change before the draft is saved on its own (S10.54). */
export const AUTOSAVE_MS = 4000;

export interface AutosaveInput {
  mode: EnumGameMode;
  lease: LeaseState;
  /** The form and the rules of the game have no errors. */
  valid: boolean;
  changed: boolean;
  saving: boolean;
}

/**
 * Whether the draft is saved by itself now: only an existing game, only by the
 * holder of its lease, only when the server will accept it (no errors) and only
 * when there is something to save. A publication is never a side effect of this.
 */
export function canAutosave(input: AutosaveInput): boolean {
  return (
    input.mode === EnumGameMode.Edit &&
    input.lease === 'held' &&
    input.valid &&
    input.changed &&
    !input.saving
  );
}

/** The line under the buttons: what the editor needs to know about his changes. */
export function autosaveLabel(input: AutosaveInput): string {
  if (input.mode !== EnumGameMode.Edit) return '';
  if (input.lease === 'busy') return 'Read only: another admin is editing';
  if (input.saving) return 'Saving…';
  if (!input.changed) return 'All changes saved';
  return input.valid
    ? 'Saved on its own in a few seconds'
    : 'Fix the errors to save the changes';
}
