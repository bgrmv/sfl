import { describe, expect, it } from 'vitest';

import { ZodValidationPipe } from '../../shared/pipes/custom-pipe/zod-validation.pipe';
import { SaveGameDTO, UpdateGameDTO } from './game.dto';
import { EnumGameStatus } from './game.schema';

// Shape of what the Angular client sends (IGameDTO serialized to JSON).
const team = (n: number) => ({
  id: `team${n}`,
  name: `Team ${n}`,
  color: 'RED',
  description: null,
  logo: null,
});

function playerStat(
  playerId: string,
  teamId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    playerId,
    teamId,
    goalsByLeg: 0,
    goalsByHead: 0,
    goalsByAuto: 0,
    goalsByPenalty: 0,
    passes: 0,
    isMVP: false,
    isTransfer: false,
    isCaptain: false,
    position: null,
    ...overrides,
  };
}

const clientGame = {
  number: 3,
  season: 2025,
  playedAt: new Date('2025-05-10T17:00:00.000Z').toISOString(),
  status: EnumGameStatus.Published,
  teams: [team(1), team(2)],
  link: '',
  description: '',
  notes: ['', ''],
  statistics: [
    playerStat('p1', 'team1', { isCaptain: true, position: 'GK' }),
    playerStat('p2', 'team2', { isCaptain: true, position: 'FRWD' }),
  ],
};

describe('game DTOs accept client payloads', () => {
  it('POST/PUT body (SaveGameDTO) incl. extra id and no metadata', () => {
    const pipe = new ZodValidationPipe(SaveGameDTO);
    expect(() => pipe.transform({ ...clientGame, id: 'x' })).not.toThrow();
  });

  it('PATCH body (UpdateGameDTO)', () => {
    const pipe = new ZodValidationPipe(UpdateGameDTO);
    expect(() => pipe.transform({ ...clientGame, id: 'x' })).not.toThrow();
  });
});

describe('game rules checked by the DTO', () => {
  const pipe = new ZodValidationPipe(SaveGameDTO);
  const messagesOf = (body: unknown): string[] => {
    try {
      pipe.transform(body);
      return [];
    } catch (error: any) {
      return error.getResponse().issues.map((i: any) => i.message);
    }
  };
  const stats = (...rows: ReturnType<typeof playerStat>[]) => ({
    ...clientGame,
    statistics: rows,
  });
  const captain1 = playerStat('p1', 'team1', {
    isCaptain: true,
    position: 'GK',
  });
  const captain2 = playerStat('p2', 'team2', {
    isCaptain: true,
    position: 'GK',
  });

  it('a team without a captain is rejected', () => {
    expect(
      messagesOf(
        stats(captain1, playerStat('p2', 'team2', { position: 'GK' })),
      ),
    ).toContain('Each team needs exactly one captain');
  });

  it('two captains in one team are rejected', () => {
    expect(
      messagesOf(
        stats(
          captain1,
          captain2,
          playerStat('p3', 'team1', { isCaptain: true, position: 'DEF' }),
        ),
      ),
    ).toContain('Each team needs exactly one captain');
  });

  it('a transfer (rows in both teams) does not break the captain rule', () => {
    const transfer = { position: 'DEF' };

    expect(
      messagesOf(
        stats(
          captain1,
          captain2,
          playerStat('p3', 'team1', transfer),
          playerStat('p3', 'team2', transfer),
        ),
      ),
    ).toEqual([]);
  });

  it('a statistic of a team that is not in the game is rejected', () => {
    expect(
      messagesOf(stats(captain1, captain2, playerStat('p3', 'team9'))),
    ).toContain('A statistic refers to a team that is not in the game');
  });

  it('a published game needs a position for every player', () => {
    expect(
      messagesOf(stats(captain1, captain2, playerStat('p3', 'team1'))),
    ).toEqual(['A published game needs a position for every player']);
  });

  it('a draft or a new game may have players without a position', () => {
    for (const status of [EnumGameStatus.Draft, EnumGameStatus.New]) {
      expect(
        messagesOf({
          ...stats(captain1, captain2, playerStat('p3', 'team1')),
          status,
        }),
      ).toEqual([]);
    }
  });
});
