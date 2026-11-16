import { TestBed } from '@angular/core/testing';
import { TeamEnum } from '@shared/constants/team';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptainsService } from '../services/captains.service';
import { TCaptain } from '../types';
import { CaptainsStore } from './captains-store';

const captain = (id: string, isCaptain = true) =>
  ({ id, nickname: id, isCaptain }) as TCaptain;

describe('CaptainsStore', () => {
  const getCaptains = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getCaptains.mockReset().mockResolvedValue([captain('a'), captain('b')]);
    TestBed.configureTestingModule({
      providers: [
        CaptainsStore,
        { provide: CaptainsService, useValue: { getCaptains } },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads the captains', async () => {
    const store = TestBed.inject(CaptainsStore);
    await vi.waitFor(() => expect(store.isFulfilled()).toBe(true));

    expect(store.captains().map(c => c.id)).toEqual(['a', 'b']);
  });

  it('a failed load is an error, not an empty list (10)', async () => {
    getCaptains.mockRejectedValueOnce(new Error('down'));
    const store = TestBed.inject(CaptainsStore);
    // The user sees the text of the API error, not the raw exception
    await vi.waitFor(() => expect(store.error()).toBeTruthy());
    expect(store.error()).not.toBe('down');

    expect(store.captains()).toEqual([]);

    store.load();
    await vi.waitFor(() => expect(store.isFulfilled()).toBe(true));
    expect(store.error()).toBeNull();
  });

  it('keeps one selected captain per team and lists the others', async () => {
    const store = TestBed.inject(CaptainsStore);
    await vi.waitFor(() => expect(store.isFulfilled()).toBe(true));

    store.addSelected({ id: 'a', team: TeamEnum.teamA });
    store.addSelected({ id: 'b', team: TeamEnum.teamA });

    expect(store.selected().map(c => c.id)).toEqual(['b']);
    expect(store.captainsWithoutTeam().map(c => c.id)).toEqual(['a']);

    store.deleteSelected('b');
    expect(store.captainsWithoutTeam()).toHaveLength(2);
  });

  it('toggleCaptain, add and delete change the list', async () => {
    const store = TestBed.inject(CaptainsStore);
    await vi.waitFor(() => expect(store.isFulfilled()).toBe(true));

    store.toggleCaptain({ id: 'a', isCaptain: false });
    expect(store.captains()[0].isCaptain).toBe(false);

    store.add(captain('c'));
    store.delete('a');
    expect(store.captains().map(c => c.id)).toEqual(['b', 'c']);
  });
});
