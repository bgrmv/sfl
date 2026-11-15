import { computed, inject } from '@angular/core';
import { getTotalWeeksBySeason } from '@entities/utils/date';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { nextSaturday } from 'date-fns';
import { range } from 'lodash-es';
import { delay, map, pipe, switchMap, tap } from 'rxjs';
import { EnumGameStatus } from '../constants';
import { GameService } from '../services/game.service';
import { IGameDTO } from '../types';

export type RequestStatus =
  'idle' | 'pending' | 'fulfilled' | { error: string };
export type RequestStatusState = { requestStatus: RequestStatus };

export interface TGamesStore {
  season: number;
  loading: boolean;
  requestStatus: RequestStatus;
}

const GAMES_ENTITY_CONFIG = entityConfig({
  entity: type<IGameDTO>(),
  collection: 'games',
  selectId: game => game.id,
});

const FEATURE_NAME = 'GAMES';
const FEATURE_INITIALIZED = `[${FEATURE_NAME} STORE] has initialized 🚀`;
const FEATURE_DESTROYED = `[${FEATURE_NAME} STORE] destroyed 💥`;

export const GamesStore = signalStore(
  withState<TGamesStore>({
    season: new Date().getFullYear(),
    loading: false,
    requestStatus: 'idle',
  }),
  withEntities(GAMES_ENTITY_CONFIG),
  withComputed(({ requestStatus }) => ({
    isPending: computed(() => requestStatus() === 'pending'),
    isFulfilled: computed(() => requestStatus() === 'fulfilled'),
    error: computed(() => {
      const status = requestStatus();
      return typeof status === 'object' ? status.error : null;
    }),
  })),
  withMethods(
    (store, { gameService } = { gameService: inject(GameService) }) => ({
      deleteGame({ id, season, number, playedAt }: IGameDTO) {
        patchState(
          store,
          updateEntity(
            {
              id,
              changes: () => ({
                id: `game-card-${season}-${number}`,
                number,
                season,
                teams: [],
                playedAt,
                status: EnumGameStatus.Furture,
                statistics: [],
              }),
            },
            GAMES_ENTITY_CONFIG,
          ),
        );
      },
      updateSeason(season: number) {
        patchState(store, { season });
      },
      initGamesStore: rxMethod<{ season: number }>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          delay(500),
          switchMap(({ season }) => {
            return gameService.find({ season }).pipe(
              map(games => ({
                games,
                season,
              })),
            );
          }),
          map(({ games, season }) => {
            const weeks = getTotalWeeksBySeason(season);
            let date = new Date(`${season - 1}-12-01`);

            const cardGames: IGameDTO[] = [];

            for (const number of range(1, weeks + 1)) {
              const numberSaturdayDate = nextSaturday(date);

              const found = games.find(game => game.number === number);

              if (found) {
                cardGames.push(found);
              } else {
                cardGames.push({
                  id: `game-card-${season}-${number}`,
                  number,
                  season,
                  teams: [],
                  playedAt: numberSaturdayDate,
                  status: EnumGameStatus.Furture,
                  statistics: [],
                  link: '',
                  description: '',
                  notes: ['', ''],
                });
              }

              date = numberSaturdayDate;
            }

            return cardGames;
          }),
          tap(games => {
            patchState(store, setAllEntities(games, GAMES_ENTITY_CONFIG), {
              loading: false,
            });
          }),
        ),
      ),
    }),
  ),
  withHooks({
    onInit() {
      console.info(FEATURE_INITIALIZED);
    },
    onDestroy() {
      console.info(FEATURE_DESTROYED);
    },
  }),
);
