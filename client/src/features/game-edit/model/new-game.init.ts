import { ParamMap } from '@angular/router';
import { isValid } from 'date-fns';
import { EnumGameStatus } from '@entities/game';
import { IGameDTO, TGameFinal, TPlayerStatisticFinal } from '@entities/game';
import { ITeamDTO } from '@entities/team';
import { TPlayerFinal } from '@entities/player';

// How the form of a game starts: new from the address, or an existing one.

/** A new object every time: the date is "now" of the call, not of the load. */
export function createInitialGame(): TGameFinal {
  return {
    id: undefined,
    number: 0,
    season: 0,
    teams: [],
    playedAt: new Date(),
    createdAt: undefined,
    updatedAt: undefined,
    statistics: [],
    status: EnumGameStatus.New,
    link: '',
    description: '',
    notes: ['', ''],
  };
}

const finiteNumber = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** The parameters of the address fill the game; garbage is ignored. */
export function initGameCreation(
  queryParam: ParamMap,
  { teams }: { teams: [ITeamDTO, ITeamDTO] },
): TGameFinal {
  const game = createInitialGame();
  game.teams = teams;

  game.number = finiteNumber(queryParam.get('number')) ?? game.number;
  game.season = finiteNumber(queryParam.get('season')) ?? game.season;

  const playedAt = queryParam.get('playedAt');
  if (playedAt && isValid(new Date(playedAt))) {
    game.playedAt = new Date(playedAt);
  }

  return game;
}

/** The game from the server in the shape of the form. */
export function normalizeSavedGame(game: IGameDTO): TGameFinal {
  return {
    ...game,
    link: game.link ?? '',
    description: game.description ?? '',
    notes: game.notes ?? ['', ''],
    playedAt: new Date(game.playedAt),
  } as TGameFinal;
}

export function initGameEdition(game?: IGameDTO): TGameFinal {
  return game ? normalizeSavedGame(game) : createInitialGame();
}

/** Attaches the player to a row; a row of an unknown player is dropped. */
export function matchStatisticsPlayerData({
  players,
  statistics,
}: {
  statistics: TPlayerStatisticFinal[];
  players: TPlayerFinal[];
}): TPlayerStatisticFinal[] {
  const byId = new Map(players.map(player => [player.id, player]));

  return statistics.flatMap(row => {
    const playerData = byId.get(row.playerId);
    return playerData ? [{ ...row, playerData }] : [];
  });
}
