import { gameSchema, playersSchema } from '@sfl/schemas';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkedResponse } from './checked-response';

const game = {
  id: 'g1',
  number: 3,
  season: 2025,
  playedAt: '2025-05-10T17:00:00.000Z',
  status: 'published',
  teams: [],
  statistics: [
    {
      playerId: 'p1',
      teamId: 't1',
      goalsByLeg: 1,
      goalsByHead: 0,
      goalsByPenalty: 0,
      passes: 0,
      isMVP: false,
      isTransfer: false,
      isCaptain: true,
      position: 'GK',
    },
  ],
};

describe('checkedResponse', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes valid data on parsed: the defaults of the schema are applied', async () => {
    const result = (await firstValueFrom(
      of(game).pipe(checkedResponse(gameSchema, 'GET games/g1')),
    )) as any;

    expect(result.statistics[0].goalsByAuto).toBe(0);
    expect(result.link).toBe('');
  });

  it('keeps a field the schema does not know', async () => {
    const result = (await firstValueFrom(
      of({ ...game, extra: 1 }).pipe(checkedResponse(gameSchema, 'GET games')),
    )) as any;

    expect(result.extra).toBe(1);
  });

  it('reports a contract violation with the path and passes the data on', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const broken = { ...game, status: 'furture' };

    const result = await firstValueFrom(
      of(broken).pipe(checkedResponse(gameSchema, 'GET games')),
    );

    expect(result).toBe(broken);
    expect(error).toHaveBeenCalledWith('API contract violation in GET games', [
      expect.stringContaining('status:'),
    ]);
  });

  it('works for a list of players', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const players = [{ id: 'p1', nickname: 'Bomber', user: { name: 'Gerd' } }];

    const result = await firstValueFrom(
      of(players).pipe(checkedResponse(playersSchema, 'GET players')),
    );

    expect(result[0].isCaptain).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
