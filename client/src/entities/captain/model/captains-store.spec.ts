import { TestBed } from '@angular/core/testing';
import { TeamEnum } from '@shared/constants/team';
import { beforeEach, describe, expect, it } from 'vitest';

import { CaptainsStore } from './captains-store';

describe('CaptainsStore', () => {
  let store: InstanceType<typeof CaptainsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CaptainsStore] });
    store = TestBed.inject(CaptainsStore);
  });

  it('starts without a selection', () => {
    expect(store.selected()).toEqual([]);
  });

  it('keeps one selected captain per team', () => {
    store.addSelected({ id: 'a', team: TeamEnum.teamA });
    store.addSelected({ id: 'b', team: TeamEnum.teamA });
    store.addSelected({ id: 'c', team: TeamEnum.teamB });

    expect(store.selected()).toEqual([
      { id: 'b', team: TeamEnum.teamA },
      { id: 'c', team: TeamEnum.teamB },
    ]);
  });

  it('deleteSelected frees the captain', () => {
    store.addSelected({ id: 'a', team: TeamEnum.teamA });
    store.deleteSelected('a');

    expect(store.selected()).toEqual([]);
  });
});
