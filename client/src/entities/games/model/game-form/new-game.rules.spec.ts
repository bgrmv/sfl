import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { TGameFinal } from '../../types';
import { isNewGameChanged } from './new-game.compare';
import {
  createInitialGame,
  initGameCreation,
  initGameEdition,
  matchStatisticsPlayerData,
  normalizeSavedGame,
} from './new-game.init';
import { validateTeamsAndStatistics } from './new-game.validation';

const team = (id: string, name = id) => ({ id, name }) as never;

const stat = (playerId: string, teamId: string, extra = {}) =>
  ({
    id: `s-${playerId}`,
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
    ...extra,
  }) as never;

const game = (extra: Record<string, unknown> = {}): TGameFinal =>
  ({
    ...createInitialGame(),
    id: 'g1',
    number: 3,
    season: 2026,
    teams: [team('t1'), team('t2')],
    statistics: [stat('p1', 't1'), stat('p2', 't2')],
    ...extra,
  }) as unknown as TGameFinal;

const changed = (
  actual: Record<string, unknown>,
  stats?: unknown[],
  teams?: unknown[],
) => {
  const initial = game();
  const actualGame = { ...initial, ...actual } as unknown as TGameFinal;
  return isNewGameChanged({
    initialGame: initial,
    actualGame,
    actualTeams: (teams ?? actualGame.teams) as never,
    actualStatistics: (stats ?? actualGame.statistics) as never,
  });
};

describe('isNewGameChanged', () => {
  it('is false for the same game', () => {
    expect(changed({})).toBe(false);
  });

  it('does not throw on empty teams', () => {
    const initial = game({ teams: [] });
    expect(
      isNewGameChanged({
        initialGame: initial,
        actualGame: initial,
        actualTeams: [],
        actualStatistics: initial.statistics as never,
      }),
    ).toBe(false);
  });

  it('sees a change of the second team, not only of the first', () => {
    expect(changed({}, undefined, [team('t1'), team('t3')])).toBe(true);
  });

  it('treats an undefined link and an empty one as equal', () => {
    expect(changed({ link: undefined, description: undefined })).toBe(false);
  });

  it('treats null notes and empty notes as equal', () => {
    expect(changed({ notes: null })).toBe(false);
  });

  it('compares playedAt as a moment, whatever the type', () => {
    const initial = game({ playedAt: new Date('2026-01-03T17:00:00Z') });
    expect(
      isNewGameChanged({
        initialGame: initial,
        actualGame: {
          ...initial,
          playedAt: '2026-01-03T17:00:00Z',
        } as unknown as TGameFinal,
        actualTeams: initial.teams,
        actualStatistics: initial.statistics as never,
      }),
    ).toBe(false);
  });

  it('sees a change of the own goals', () => {
    expect(
      changed({}, [stat('p1', 't1', { goalsByAuto: 1 }), stat('p2', 't2')]),
    ).toBe(true);
  });

  it('sees every field of a statistic row', () => {
    for (const field of [
      { goalsByLeg: 1 },
      { goalsByHead: 1 },
      { goalsByPenalty: 1 },
      { passes: 1 },
      { position: 'wing' },
      { isMVP: true },
      { isCaptain: true },
      { isTransfer: true },
    ]) {
      expect(changed({}, [stat('p1', 't1', field), stat('p2', 't2')])).toBe(
        true,
      );
    }
  });

  it('ignores the id and the player data of a row', () => {
    expect(
      changed({}, [
        stat('p1', 't1', { id: 'other', playerData: { nickname: 'x' } }),
        stat('p2', 't2'),
      ]),
    ).toBe(false);
  });

  it('sees a changed order of the rows', () => {
    expect(changed({}, [stat('p2', 't2'), stat('p1', 't1')])).toBe(true);
  });
});

describe('initGameCreation', () => {
  const teams = [team('t1'), team('t2')] as never;

  it('takes valid parameters of the address', () => {
    const created = initGameCreation(
      convertToParamMap({
        number: '4',
        season: '2026',
        playedAt: '2026-01-10T17:00:00Z',
      }),
      { teams },
    );

    expect(created.number).toBe(4);
    expect(created.season).toBe(2026);
    expect(created.playedAt.toISOString()).toBe('2026-01-10T17:00:00.000Z');
  });

  it('ignores garbage: no NaN, no Invalid Date', () => {
    const created = initGameCreation(
      convertToParamMap({ number: 'x', season: 'y', playedAt: 'abc' }),
      { teams },
    );

    expect(Number.isFinite(created.number)).toBe(true);
    expect(Number.isFinite(created.season)).toBe(true);
    expect(Number.isNaN(created.playedAt.getTime())).toBe(false);
  });

  it('builds a new initial game every time, with the current date', () => {
    const first = createInitialGame();
    const second = createInitialGame();

    expect(first).not.toBe(second);
    expect(first.notes).not.toBe(second.notes);
  });
});

describe('initGameEdition and normalizeSavedGame', () => {
  it('give the same game for the same input', () => {
    const saved = {
      id: 'g1',
      number: 1,
      season: 2026,
      playedAt: '2026-01-03T17:00:00Z',
      notes: null,
      link: null,
    } as never;

    expect(initGameEdition(saved)).toEqual(normalizeSavedGame(saved));
    expect(normalizeSavedGame(saved).notes).toEqual(['', '']);
    expect(normalizeSavedGame(saved).playedAt).toBeInstanceOf(Date);
  });

  it('without a game gives a fresh initial one', () => {
    expect(initGameEdition(undefined).status).toBe(createInitialGame().status);
  });
});

describe('matchStatisticsPlayerData', () => {
  it('does not change its input and attaches the player', () => {
    const rows = [stat('p1', 't1')];
    const before = JSON.stringify(rows);

    const result = matchStatisticsPlayerData({
      statistics: rows,
      players: [{ id: 'p1', nickname: 'Ann' }] as never,
    });

    expect(JSON.stringify(rows)).toBe(before);
    expect(result[0].playerData).toMatchObject({ nickname: 'Ann' });
  });

  it('drops a row of an unknown player', () => {
    expect(
      matchStatisticsPlayerData({
        statistics: [stat('ghost', 't1')],
        players: [],
      }),
    ).toEqual([]);
  });
});

describe('validateTeamsAndStatistics', () => {
  it('asks for both teams', () => {
    expect([
      ...validateTeamsAndStatistics({ teams: [], statistics: [] }).keys(),
    ]).toEqual(['teams:teamA:required', 'teams:teamB:required']);
  });

  it('asks for a player in every team', () => {
    const errors = validateTeamsAndStatistics({
      teams: [team('t1', 'BMW'), team('t2', 'HONDA')],
      statistics: [stat('p1', 't1')],
    });

    expect([...errors.keys()]).toEqual(['statistics:teamB:atleastOne']);
  });
});
