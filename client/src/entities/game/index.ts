export { GameService } from './api/game.service';
export { GameListStatisticsPipe } from './lib/game-list-statistics.pipe';
export { EnumGameStatus } from './model/game-status';
export { GamesStore } from './model/games.store';
export type {
  IGameDTO,
  IGameSettings,
  TGameFinal,
  TGameFinalWithoutStatistics,
} from './model/game';
export type {
  GamePlayerStatistic,
  IPlayerStatisticDTO,
  IPlayerStatisticSettings,
  TGamePlayerStatisticFinal,
  TPlayerStatisticFinal,
  TPlayerStatisticFinalBoolean,
  TPlayerStatisticFinalBooleanKeys,
  TPlayerStatisticFinalIds,
  TPlayerStatisticFinalNumber,
  TPlayerStatisticFinalNumberKeys,
} from './model/game-statistic';
