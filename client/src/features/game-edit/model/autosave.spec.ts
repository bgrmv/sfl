import { describe, expect, it } from 'vitest';
import { autosaveLabel, canAutosave, type AutosaveInput } from './autosave';
import { EnumGameMode } from './game-mode';

const ready: AutosaveInput = {
  mode: EnumGameMode.Edit,
  lease: 'held',
  valid: true,
  changed: true,
  saving: false,
};

describe('canAutosave (S10.54)', () => {
  it('saves a changed, valid game that the editor holds', () => {
    expect(canAutosave(ready)).toBe(true);
  });

  it.each([
    ['a new game (the first save is a button)', { mode: EnumGameMode.Create }],
    ['a game of another editor', { lease: 'busy' as const }],
    ['a game without a lease yet', { lease: 'none' as const }],
    ['a game with errors', { valid: false }],
    ['a game with nothing to save', { changed: false }],
    ['a game that is being saved', { saving: true }],
  ])('does not save %s', (_name, change) => {
    expect(canAutosave({ ...ready, ...change })).toBe(false);
  });
});

describe('autosaveLabel', () => {
  it('says what happens to the changes', () => {
    expect(autosaveLabel({ ...ready, changed: false })).toBe(
      'All changes saved',
    );
    expect(autosaveLabel(ready)).toBe('Saved on its own in a few seconds');
    expect(autosaveLabel({ ...ready, valid: false })).toBe(
      'Fix the errors to save the changes',
    );
    expect(autosaveLabel({ ...ready, saving: true })).toBe('Saving…');
    expect(autosaveLabel({ ...ready, lease: 'busy' })).toContain('Read only');
    expect(autosaveLabel({ ...ready, mode: EnumGameMode.Create })).toBe('');
  });
});
