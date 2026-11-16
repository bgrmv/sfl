import { computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { injectNotifier } from '@shared/store/inject-notifier';
import { tapResult } from '@shared/store/tap-result';
import { toResult } from '@shared/api/to-result';
import { cloneDeep } from 'lodash-es';
import {
  EMPTY,
  Observable,
  catchError,
  finalize,
  first,
  forkJoin,
  map,
  exhaustMap,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { EnumGameMode, EnumGameStatus } from '../../constants';
import { GameService } from '../../services/game.service';
import { IGameDTO, TGameFinal, TPlayerStatisticFinal } from '../../types';
import { validateGameRules } from './game-rules';
import { INITIAL_NEW_GAME_STATE } from './new-game.state';
import { isNewGameChanged } from './new-game.compare';
import {
  initGameCreation,
  initGameEdition,
  matchStatisticsPlayerData,
  normalizeSavedGame,
} from './new-game.init';
import { validateTeamsAndStatistics } from './new-game.validation';
import { withPlayersFeature } from './players.feature';
import { withPlayerStatisticsFeature } from './statistics.feature';
import { withTeamsFeature } from './teams.feature';

// Read https://offering.solutions/blog/articles/2023/12/03/ngrx-signal-store-getting-started/

export const NewGameStore = signalStore(
  withState(INITIAL_NEW_GAME_STATE),
  withTeamsFeature(),
  withPlayersFeature(),
  withPlayerStatisticsFeature(),
  withComputed(({ game, loading, initLoading, mode }) => ({
    gameId: computed(() => game().id),
    storeLoaded: computed(
      () =>
        !loading() &&
        !initLoading() &&
        [EnumGameMode.Create, EnumGameMode.Edit].includes(mode()),
    ),
  })),
  // What the form lacks: derived from the data, never stored
  withComputed(({ storeLoaded, game, teamsEntities, statisticsEntities }) => ({
    errors: computed(() =>
      storeLoaded()
        ? new Map([
            ...validateTeamsAndStatistics({
              teams: teamsEntities(),
              statistics: statisticsEntities(),
            }),
            // The rules of the server (@sfl/schemas): one captain per team,
            // a position for every player of a published game
            ...validateGameRules({
              status: game().status,
              teams: teamsEntities(),
              statistics: statisticsEntities(),
            }),
          ])
        : new Map<string, string>(),
    ),
  })),
  withComputed(
    ({
      initialValue,
      initLoading,
      errors,
      game,
      teamsEntities,
      statisticsEntities,
    }) => ({
      isFormChanged: computed(() => {
        const initial = initialValue();
        if (!initial || initLoading() || errors().size) {
          return false;
        }

        return isNewGameChanged({
          initialGame: initial,
          actualGame: game(),
          actualTeams: teamsEntities(),
          actualStatistics: statisticsEntities(),
        });
      }),
    }),
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
    ) => {
      const notify = injectNotifier();

      const buildGameDTO = (): IGameDTO => {
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

        return {
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
        } as IGameDTO;
      };

      return {
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
        /** Create: `exhaustMap` ignores a second click while a request runs. */
        saveGame: rxMethod<void>(
          pipe(
            exhaustMap(() => {
              patchState(store, { saving: true });
              return gameService.create(buildGameDTO()).pipe(
                toResult(),
                tapResult({
                  ok: ({ season, number }) => {
                    notify.success('Game created');
                    router.navigate(['games', 'edit', season, number]);
                  },
                  err: notify.error,
                }),
                finalize(() => patchState(store, { saving: false })),
              );
            }),
          ),
        ),

        /** Update: the answer of the server becomes the state, no reload. */
        updateGame: rxMethod<void>(
          pipe(
            exhaustMap(() => {
              patchState(store, { saving: true });
              const dto = buildGameDTO();
              return gameService.update(dto.id!, dto).pipe(
                toResult(),
                tapResult({
                  ok: saved => {
                    const game = normalizeSavedGame(saved);
                    patchState(store, { game, initialValue: cloneDeep(game) });
                    notify.success('Game saved');
                  },
                  err: notify.error,
                }),
                finalize(() => patchState(store, { saving: false })),
              );
            }),
          ),
        ),

        /** Loads the game; an error ends one load, the next call works again. */
        initGame: rxMethod<void>(
          pipe(
            tap(() => patchState(store, { loading: true, initLoading: true })),
            switchMap(() =>
              forkJoin({
                paramMap: activatedRoute.paramMap.pipe(first()),
                queryParamMap: activatedRoute.queryParamMap.pipe(first()),
                teams: teamsService.find(),
                players: playersService.find(),
              }).pipe(
                switchMap(({ paramMap, queryParamMap, teams, players }) => {
                  const season = paramMap.get('season');
                  const number = paramMap.get('number');
                  const mode =
                    season && number ? EnumGameMode.Edit : EnumGameMode.Create;

                  const game$: Observable<TGameFinal> =
                    season && number
                      ? gameService
                          .find({
                            season: Number(season),
                            number: Number(number),
                          })
                          .pipe(
                            map(games => {
                              if (!games[0]) {
                                throw new Error('Game not found');
                              }
                              return initGameEdition(games[0]);
                            }),
                          )
                      : of(initGameCreation(queryParamMap, { teams }));

                  return game$.pipe(
                    tap(game => {
                      patchState(store, {
                        mode,
                        game,
                        initialValue: cloneDeep(game),
                        loading: false,
                        initLoading: true,
                      });

                      const rows = game.statistics as TPlayerStatisticFinal[];
                      const stats = matchStatisticsPlayerData({
                        players,
                        statistics: rows,
                      });
                      if (stats.length < rows.length) {
                        notify.fail(
                          'Some players of this game are missing and were left out',
                        );
                      }

                      store.initTeamsEntity(game.teams ?? teams);
                      store.initEntityPlayers(players);
                      store.initEntityStatistics(stats);
                    }),
                    finalize(() => {
                      patchState(store, { loading: false, initLoading: false });
                    }),
                  );
                }),
                // Inside the inner stream: the outer one stays subscribed
                catchError(error => {
                  patchState(store, {
                    loading: false,
                    initLoading: false,
                    mode: EnumGameMode.Unknown,
                  });
                  notify.fail(
                    error instanceof Error
                      ? error.message
                      : 'The game was not loaded',
                  );
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),
  withHooks({
    onInit({ initGame }) {
      initGame();
    },
  }),
);
