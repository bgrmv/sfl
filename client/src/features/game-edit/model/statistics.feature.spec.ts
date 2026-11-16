import { TestBed } from '@angular/core/testing';
import { signalStore, withState } from '@ngrx/signals';
import { describe, expect, it } from 'vitest';

import { TPlayerStatisticFinal } from '@entities/game';
import { INITIAL_NEW_GAME_STATE } from './new-game.state';
import { withPlayersFeature } from './players.feature';
import {
  generatePlayerStatisticID,
  withPlayerStatisticsFeature,
} from './statistics.feature';
import { withTeamsFeature } from './teams.feature';

const FormStore = signalStore(
  { providedIn: 'root', protectedState: false },
  withState(INITIAL_NEW_GAME_STATE),
  withTeamsFeature(),
  withPlayersFeature(),
  withPlayerStatisticsFeature(),
);

const row = (
  playerId: string,
  teamId: string,
  extra: Partial<TPlayerStatisticFinal> = {},
): TPlayerStatisticFinal =>
  ({
    id: generatePlayerStatisticID({ playerId, teamId }),
    playerId,
    teamId,
    goalsByLeg: 0,
    goalsByHead: 0,
    goalsByPenalty: 0,
    goalsByAuto: 0,
    passes: 0,
    position: null,
    isMVP: false,
    isCaptain: false,
    isTransfer: false,
    playerData: { nickname: playerId },
    ...extra,
  }) as TPlayerStatisticFinal;

const setup = (rows: TPlayerStatisticFinal[]) => {
  const store = TestBed.inject(FormStore);
  store.initTeamsEntity([
    { id: 't1', name: 'BMW' },
    { id: 't2', name: 'HONDA' },
  ] as never);
  store.initEntityStatistics(rows);
  return store;
};

describe('withPlayerStatisticsFeature', () => {
  it('toggleIsCaptain leaves one captain in the team', () => {
    const store = setup([
      row('p1', 't1', { isCaptain: true }),
      row('p2', 't1'),
      row('p3', 't2', { isCaptain: true }),
    ]);

    store.toggleIsCaptain(row('p2', 't1'));

    const captains = store
      .statisticsEntities()
      .filter(stat => stat.isCaptain)
      .map(stat => stat.playerId);
    expect(captains.sort()).toEqual(['p2', 'p3']);
  });

  it('patchNumberKeysStatistics adds to the number', () => {
    const store = setup([row('p1', 't1', { goalsByHead: 2 })]);

    store.patchNumberKeysStatistics({
      statistic: row('p1', 't1', { goalsByHead: 2 }),
      number: 1,
      key: 'goalsByHead',
    });

    expect(store.statisticsEntities()[0].goalsByHead).toBe(3);
  });

  it('a transfer adds the player to the opposite team', () => {
    const store = setup([row('p1', 't1', { isCaptain: true })]);

    store.toggleTransferable(
      row('p1', 't1', { isTransfer: true, isCaptain: true }),
    );

    const rows = store.statisticsEntities();
    expect(rows.map(stat => stat.id).sort()).toEqual(['t1~p1', 't2~p1']);
    const added = rows.find(stat => stat.teamId === 't2')!;
    expect(added).toMatchObject({ isTransfer: true, isCaptain: false });
    expect(rows.find(stat => stat.teamId === 't1')!.isTransfer).toBe(true);
  });

  it('taking a transfer back removes the added row and clears the flag', () => {
    const store = setup([
      row('p1', 't1', { isTransfer: true }),
      row('p1', 't2', { isTransfer: true }),
    ]);

    store.toggleTransferable(row('p1', 't2', { isTransfer: false }));

    expect(store.statisticsEntities().map(stat => stat.id)).toEqual(['t1~p1']);
    expect(store.statisticsEntities()[0].isTransfer).toBe(false);
  });

  it('with one row the flag is simply cleared', () => {
    const store = setup([row('p1', 't1', { isTransfer: true })]);

    store.toggleTransferable(row('p1', 't1', { isTransfer: false }));

    expect(store.statisticsEntities()[0].isTransfer).toBe(false);
  });

  it('refuses a player in more than two rows', () => {
    const store = setup([row('p1', 't1'), row('p1', 't2'), row('p1', 't3')]);

    expect(() =>
      store.toggleTransferable(row('p1', 't1', { isTransfer: false })),
    ).toThrow();
  });

  it('swapStatistics moves every row to the other team with a new id', () => {
    const store = setup([row('p1', 't1'), row('p2', 't2')]);
    expect(store.swapEnabled()).toBe(true);

    store.swapStatistics();

    expect(
      store
        .statisticsEntities()
        .map(stat => [stat.playerId, stat.teamId, stat.id])
        .sort(),
    ).toEqual([
      ['p1', 't2', 't2~p1'],
      ['p2', 't1', 't1~p2'],
    ]);
  });

  it('swapStatistics does nothing while a team is empty', () => {
    const store = setup([row('p1', 't1')]);

    expect(store.swapEnabled()).toBe(false);
    store.swapStatistics();

    expect(store.statisticsEntities()[0].teamId).toBe('t1');
  });

  it('getStatististicsDTOs drops the id and the player data', () => {
    const store = setup([row('p1', 't1')]);

    const [dto] = store.getStatististicsDTOs();

    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('playerData');
    expect(dto.playerId).toBe('p1');
  });
});
