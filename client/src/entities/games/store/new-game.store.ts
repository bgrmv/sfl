import { computed, effect, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { PlayersService } from '@entities/players/services/players.service';
import { TeamsService } from '@entities/teams';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { TeamEnum } from '@shared/constants/team';
import { isDate } from 'date-fns';
import { cloneDeep, isEqual, omit } from 'lodash-es';
import {
  NEVER,
  Observable,
  catchError,
  delay,
  finalize,
  first,
  forkJoin,
  map,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { EnumGameMode, EnumGameStatus } from '../constants';
import { GameService } from '../services/game.service';
import {
  IGameDTO,
  IPlayerStatisticDTO,
  ITeamDTO,
  TGameFinal,
  TPlayerFinal,
  TPlayerStatisticFinal,
  TTeamFinal,
} from '../types';
import { validateGameRules } from './game-rules';
import { withPlayersFeature } from './players.feature';
import { withPlayerStatisticsFeature } from './statistics.feature';
import { withTeamsFeature } from './teams.feature';

export type GameTeam = { id: string; name: TeamEnum; disable: boolean };

const FEATURE_NAME = 'NEW GAME';

const FEATURE_INITIALIZED = `[${FEATURE_NAME} STORE FEATURE] has been initialized 🚀`;

const FEATURE_DESTROYED = `[${FEATURE_NAME} STORE FEATURE] destroyed 💥`;

export interface NewGameState {
  game: TGameFinal;
  // One level game fields;
  teams: [TTeamFinal, TTeamFinal] | [];
  statistics: TPlayerStatisticFinal[];

  // Needed to keep all players with specific state

  // For internal process
  loading: boolean;
  initLoading: boolean;
  initialValue: null | TGameFinal;
  mode: EnumGameMode;
  errors: Map<string, string>;
}

export const INITIAL_GAME_STATE: TGameFinal = {
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

const INITIAL_NEW_GAME_STATE: NewGameState = {
  game: INITIAL_GAME_STATE,
  // players: [],

  // One level game fields
  teams: [],
  statistics: [],

  // For internal process
  loading: false,
  initLoading: true,
  initialValue: null,
  mode: EnumGameMode.Init,
  errors: new Map(),
};

// Read https://offering.solutions/blog/articles/2023/12/03/ngrx-signal-store-getting-started/

function isNewGameChanged({
  initialGame,
  actualGame,
  actualTeams,
  actualStatistics,
}: {
  initialGame: TGameFinal;
  actualGame: TGameFinal;
  actualTeams: TTeamFinal[];
  actualStatistics: TPlayerStatisticFinal[];
}): boolean {
  // Game
  if (!isEqual(initialGame.id, actualGame.id)) {
    return true;
  }

  if (!isEqual(initialGame.number, actualGame.number)) {
    return true;
  }

  if (!isEqual(initialGame.season, actualGame.season)) {
    return true;
  }

  if (!isEqual(initialGame.playedAt, actualGame.playedAt)) {
    return true;
  }

  if (!isEqual(initialGame.status, actualGame.status)) {
    return true;
  }

  if (!isEqual(initialGame.link?.trim() ?? '', actualGame.link?.trim())) {
    return true;
  }

  if (
    !isEqual(
      initialGame.description?.trim() ?? '',
      actualGame.description?.trim(),
    )
  ) {
    return true;
  }

  if (!isEqual(initialGame.notes ?? [], actualGame.notes)) {
    return true;
  }

  // Teams
  const initialTeamId = initialGame.teams.at(0)!.id;
  const actualTeamId = actualTeams.at(0)!.id;
  if (initialTeamId !== actualTeamId) {
    return true;
  }

  // Statistics
  const initialStatistics: IPlayerStatisticDTO[] = initialGame.statistics;
  const actualStatisticsDto: IPlayerStatisticDTO[] = actualStatistics.map(
    stats => omit(stats, 'id', 'playerData'),
  );

  if (actualStatisticsDto.length !== initialStatistics.length) {
    return true;
  }

  for (const actual of actualStatisticsDto) {
    const initial = initialStatistics.find(
      stats =>
        stats.playerId === actual.playerId && stats.teamId === actual.teamId,
    );

    const compareLog = (at: string) => {
      console.info({
        at,
        initial,
        actual,
      });
    };

    if (!initial) {
      return true;
    }

    const actualIndex = actualStatisticsDto.findIndex(
      stats =>
        stats.playerId === actual.playerId && stats.teamId === actual.teamId,
    );
    const initialIndex = initialStatistics.findIndex(
      stats =>
        stats.playerId === actual.playerId && stats.teamId === actual.teamId,
    );

    if (initialIndex !== actualIndex) {
      compareLog('index');
      return true;
    }

    if (initial.goalsByLeg !== actual.goalsByLeg) {
      compareLog('goalsByLeg');
      return true;
    }

    if (initial.goalsByHead !== actual.goalsByHead) {
      compareLog('goalsByHead');
      return true;
    }

    if (initial.goalsByPenalty !== actual.goalsByPenalty) {
      compareLog('goalsByPenalty');
      return true;
    }

    if (initial.position !== actual.position) {
      compareLog('position');
      return true;
    }

    if (initial.passes !== actual.passes) {
      compareLog('passes');
      return true;
    }

    if (initial.isMVP !== actual.isMVP) {
      compareLog('isMVP');
      return true;
    }

    if (initial.isCaptain !== actual.isCaptain) {
      compareLog('isCaptain');
      return true;
    }

    if (initial.isTransfer !== actual.isTransfer) {
      compareLog('isTransfer');
      return true;
    }
  }

  return false;
}

function matchStatisticsPlayerData({
  players,
  statistics,
}: {
  statistics: TPlayerStatisticFinal[];
  players: TPlayerFinal[];
}): TPlayerStatisticFinal[] {
  const mappedStatistics = statistics.map(element => {
    const data = players.find(player => player.id === element.playerId);
    if (!data) {
      return undefined;
    }

    element.playerData = data;

    return element;
  });

  return mappedStatistics.filter(Boolean) as TPlayerStatisticFinal[];
}

function initGameCreation(
  queryParam: ParamMap,
  { teams }: { teams: [ITeamDTO, ITeamDTO] },
): Observable<TGameFinal> {
  const game = cloneDeep(INITIAL_GAME_STATE);
  game.teams = teams;

  if (queryParam.has('number')) {
    game.number = Number(queryParam.get('number'));
  }

  if (queryParam.has('season')) {
    game.season = Number(queryParam.get('season'));
  }

  if (
    queryParam.has('playedAt') &&
    queryParam.get('playedAt') &&
    isDate(new Date(queryParam.get('playedAt')!))
  ) {
    game.playedAt = new Date(queryParam.get('playedAt')!);
  }

  return of(game);
}

function initGameEdition(game?: TGameFinal): Observable<TGameFinal> {
  if (game) {
    return of({
      ...game,
      link: game.link ?? '',
      description: game.description ?? '',
      notes: game.notes ?? ['', ''],
      playedAt: new Date(game.playedAt),
    });
  }

  return of(cloneDeep(INITIAL_GAME_STATE));
}

function validateTeamsAndStatistics({
  teams,
  statistics,
}: {
  teams: TTeamFinal[];
  statistics: TPlayerStatisticFinal[];
}): Map<string, string> {
  const errorsMap: Map<string, string> = new Map();

  const teamA = teams.at(0);
  const teamB = teams.at(1);

  if (!teamA) {
    errorsMap.set('teams:teamA:required', 'Team A is required');
  }

  if (!teamB) {
    errorsMap.set('teams:teamB:required', 'Team B is required');
  }

  if (!teamA || !teamB) {
    return errorsMap;
  }

  // Statistics
  const teamNameA = teamA.name;
  const statisticsA = statistics.filter(stat => stat.teamId === teamA?.id);
  // const statisticsPassesA = statisticsA.reduce((acc, next) => {
  //   return acc + next.passes;
  // }, 0);
  // const statisticsGaolsA = statisticsA.reduce((acc, next) => {
  //   return acc + next.goalsByLeg + next.goalsByHead;
  // }, 0);

  const teamNameB = teamB.name;
  const statisticsB = statistics.filter(stat => stat.teamId === teamB?.id);
  // const statisticsPassesB = statisticsB.reduce((acc, next) => {
  //   return acc + next.passes;
  // }, 0);
  // const statisticsGaolsB = statisticsB.reduce((acc, next) => {
  //   return acc + next.goalsByLeg + next.goalsByHead;
  // }, 0);

  if (!statisticsA.length) {
    errorsMap.set(
      'statistics:teamA:atleastOne',
      `Team ${teamNameA} must have at least one player`,
    );
  }

  // if (statisticsPassesA < statisticsGaolsA) {
  //   errorsMap.set(
  //     'statistics:teamA:passesLessThanGoals',
  //     `Team ${teamNameA} passes is less than goals`,
  //   );
  // }

  if (!statisticsB.length) {
    errorsMap.set(
      'statistics:teamB:atleastOne',
      `Team ${teamNameB} must have at least one player`,
    );
  }

  // if (statisticsPassesB < statisticsGaolsB) {
  //   errorsMap.set(
  //     'statistics:teamB:passesLessThanGoals',
  //     `Team ${teamNameB} passes is less than goals`,
  //   );
  // }

  return errorsMap;
}

export const NewGameStore = signalStore(
  withState(INITIAL_NEW_GAME_STATE),
  withTeamsFeature(),
  withPlayersFeature(),
  withPlayerStatisticsFeature(),
  withComputed(
    ({
      // players,
      initialValue,
      game,
      loading,
      initLoading,
      mode,
      statisticsEntities,
      teamsEntities,
      errors,
    }) => {
      return {
        gameId: computed(() => game().id),
        storeLoaded: computed(
          () =>
            !loading() &&
            !initLoading() &&
            [EnumGameMode.Create, EnumGameMode.Edit].includes(mode()),
        ),
        isFormChanged: computed(() => {
          if (!initialValue() || initLoading() || errors().size) {
            return false;
          }

          return isNewGameChanged({
            initialGame: initialValue() as TGameFinal,
            actualGame: game(),
            actualTeams: teamsEntities(),
            actualStatistics: statisticsEntities(),
          });
        }),
      };
    },
  ),

  withMethods(
    (
      store,
      { router, activatedRoute, gameService, playersService, teamsService } = {
        router: inject(Router),
        activatedRoute: inject(ActivatedRoute),
        gameService: inject(GameService),
        playersService: inject(PlayersService),
        teamsService: inject(TeamsService),
      },
    ) => ({
      // Game
      updateStatus: (status: EnumGameStatus): void => {
        patchState(store, state => ({
          game: { ...state.game, status },
        }));
      },
      updateGameFields(game: Partial<TGameFinal>): void {
        patchState(store, state => ({
          game: { ...state.game, ...game },
        }));
      },
      saveGame() {
        const {
          id,
          status,
          number,
          season,
          playedAt,
          link,
          description,
          notes,
        } = store.game() as IGameDTO;

        const gameDTO = <IGameDTO>{
          id,
          status,
          number,
          season,
          playedAt,
          link,
          description,
          notes,
          teams: store.teamsEntities(),
          statistics: store.getStatististicsDTOs(),
        };

        // TODO
        gameService.create(gameDTO).subscribe(game => {
          const { season, number } = game;
          if (!game) {
            console.error('GAME IS NOT CREATED');
            return;
          }

          router.navigate(['games', 'edit', season, number]);
        });
      },

      updateGame() {
        const {
          id,
          status,
          number,
          season,
          playedAt,
          link,
          description,
          notes,
        } = store.game() as IGameDTO;

        const gameDTO = <IGameDTO>{
          id,
          status,
          number,
          season,
          playedAt,
          link,
          description,
          notes,
          teams: store.teamsEntities(),
          statistics: store.getStatististicsDTOs(),
        };

        gameService.update(id, gameDTO).subscribe(game => {
          if (!game) {
            console.error('GAME IS NOT UPDATED');
            return;
          }

          patchState(store, { initialValue: game });
          this.initGame();
        });
      },
      initGame: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, initLoading: true })),
          delay(500),
          switchMap(() =>
            forkJoin({
              paramMap: activatedRoute.paramMap.pipe(first()),
              queryParamMap: activatedRoute.queryParamMap.pipe(first()),
              teams: teamsService.find(),
              players: playersService.find(),
            }),
          ),
          switchMap<
            {
              paramMap: ParamMap;
              queryParamMap: ParamMap;
              teams: [ITeamDTO, ITeamDTO];
              players: TPlayerFinal[];
            },
            Observable<TGameFinal>
          >(({ paramMap, queryParamMap, teams, players }) => {
            const season = paramMap.get('season');
            const number = paramMap.get('number');
            const mode =
              season && number ? EnumGameMode.Edit : EnumGameMode.Create;

            // Switch mode + cases
            const gameObservable: Observable<TGameFinal> =
              !season || !number
                ? // Inititialize and prepared data for creation mode
                  initGameCreation(queryParamMap, { teams })
                : // Load & prepared data for editing game
                  gameService
                    .find({
                      season: Number(season),
                      number: Number(number),
                    })
                    .pipe(
                      map(games => games.at(0)),

                      switchMap(game => {
                        if (!game) {
                          throw new Error('Game not found');
                        }

                        return initGameEdition(game);
                      }),
                    );

            // Update state
            return gameObservable.pipe(
              tap((game: TGameFinal) => {
                patchState(store, () => ({
                  mode,
                  game,
                  // players: cloneDeep(players),
                  initialValue: cloneDeep(game),
                  loading: false,
                  initLoading: true,
                }));

                const stats = matchStatisticsPlayerData({
                  players,
                  statistics: game.statistics as TPlayerStatisticFinal[],
                });

                store.initTeamsEntity(game.teams ?? teams);
                store.initEntityPlayers(players);
                store.initEntityStatistics(stats);
              }),
              finalize(() => {
                console.info('FINALIZE: INIT GAME', {
                  loading: false,
                  initLoading: false,
                });
                patchState(store, { loading: false, initLoading: false });
              }),
            );
          }),
          catchError((error: any, caught) => {
            console.error('GameStore Crashed with error:', error, caught);

            patchState(store, {
              loading: false,
              mode: EnumGameMode.Unknown,
            });

            return NEVER;
          }),
        ),
      ),
    }),
  ),
  // Should be latest to read methods
  withHooks({
    onInit(store) {
      console.info(FEATURE_INITIALIZED);
      store.initGame();

      effect(
        () => {
          if (!store.storeLoaded()) {
            return;
          }

          const errors = new Map([
            ...validateTeamsAndStatistics({
              teams: store.teamsEntities(),
              statistics: store.statisticsEntities(),
            }),
            // The rules of the server (@sfl/schemas): one captain per team,
            // a position for every player of a published game
            ...validateGameRules({
              status: store.game().status,
              teams: store.teamsEntities(),
              statistics: store.statisticsEntities(),
            }),
          ]);

          patchState(store, { errors });
        },
        {
          allowSignalWrites: true,
        },
      );
    },
    onDestroy() {
      console.info(FEATURE_DESTROYED);
    },
  }),
);
