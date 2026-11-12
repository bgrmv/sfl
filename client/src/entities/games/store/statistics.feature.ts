import { computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withComputed,
  withHooks,
  withMethods,
} from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { omit } from 'lodash-es';
import { GamePlayerStatistic } from '../components/game-create-player-statistics/game-create-player-statistics.component';
import {
  EnumPlayerPosition,
  IPlayerStatisticDTO,
  IPlayerStatisticSettings,
  TPlayerStatisticFinal,
  TPlayerStatisticFinalBoolean,
  TPlayerStatisticFinalBooleanKeys,
  TPlayerStatisticFinalIds,
  TPlayerStatisticFinalNumber,
  TPlayerStatisticFinalNumberKeys,
  TTeamFinal,
} from '../types';
import { NewGameState } from './new-game.store';
import { NEW_GAME_TEAMS_ENTITY_CONFIG } from './teams.feature';

const STATISTIC_ENTITY_CONFIG = entityConfig({
  entity: type<TPlayerStatisticFinal>(),
  collection: 'statistics',
  selectId: statistic => statistic.id,
});

const FEATURE_NAME = 'PLAYER STATISTICS';

const FEATURE_INITIALIZED = `[${FEATURE_NAME} STORE FEATURE] has been initialized 🚀`;

const FEATURE_DESTROYED = `[${FEATURE_NAME} STORE FEATURE] destroyed 💥`;

export const DEFAULT_STATISTIC_IDS_VALUES: Partial<TPlayerStatisticFinalIds> = {
  playerId: undefined,
  teamId: undefined,
};

export const DEFAULT_STATISTIC_BOOLEAN_VALUES: TPlayerStatisticFinalBoolean = {
  isMVP: false,
  isCaptain: false,
  isTransfer: false,
};

export const DEFAULT_STATISTIC_NUMBER_VALUES: TPlayerStatisticFinalNumber = {
  goalsByAuto: 0,
  goalsByLeg: 0,
  goalsByHead: 0,
  passes: 0,
  goalsByPenalty: 0,
};

export const DEFAULT_STATISTIC_VALUES: Required<
  Pick<
    TPlayerStatisticFinal,
    TPlayerStatisticFinalNumberKeys | TPlayerStatisticFinalBooleanKeys
  > & { position: EnumPlayerPosition | null }
> = {
  position: null,
  ...DEFAULT_STATISTIC_IDS_VALUES,
  ...DEFAULT_STATISTIC_BOOLEAN_VALUES,
  ...DEFAULT_STATISTIC_NUMBER_VALUES,
};

function getOppositeTeamId(
  teamId: string,
  teams: [TTeamFinal, TTeamFinal],
): string {
  return teamId === teams.at(0)?.id ? teams.at(1)!.id : teams.at(0)!.id;
}

export function generatePlayerStatisticID({
  teamId,
  playerId,
}: Pick<IPlayerStatisticDTO, 'teamId' | 'playerId'>): string {
  return `${teamId}~${playerId}`;
}

function mapStatisticDTOtoFinal(
  statistic: TPlayerStatisticFinal,
): TPlayerStatisticFinal {
  return {
    ...statistic,
    id: generatePlayerStatisticID(statistic),
  };
}

function mapStatisticsFinaltoDTO(
  statistics: TPlayerStatisticFinal[],
): IPlayerStatisticDTO[] {
  return statistics.map(stat =>
    omit<TPlayerStatisticFinal, keyof IPlayerStatisticSettings>(
      stat,
      'id',
      'playerData',
    ),
  );
}

export function withPlayerStatisticsFeature() {
  return signalStoreFeature(
    {
      state: type<NewGameState>(),
    },
    withEntities(STATISTIC_ENTITY_CONFIG),
    withEntities(NEW_GAME_TEAMS_ENTITY_CONFIG),
    withComputed(store => ({
      // TODO: need id
      statisticsWithoutTeamId: computed(() =>
        store.statisticsEntities().filter(stat => !stat.teamId),
      ),
      statisticsBMW: computed(() => {
        return store
          .statisticsEntities()
          .filter(stat => stat.teamId === store.teamsEntities().at(0)?.id);
      }),
      // TODO: need id
      statisticsHONDA: computed(() => {
        return store
          .statisticsEntities()
          .filter(stat => stat.teamId === store.teamsEntities().at(1)?.id);
      }),
      swapEnabled: computed(() => {
        return (
          store
            .statisticsEntities()
            .filter(stat => stat.teamId === store.teamsEntities().at(0)?.id)
            .length > 0 &&
          store
            .statisticsEntities()
            .filter(stat => stat.teamId === store.teamsEntities().at(1)?.id)
            .length > 0
        );
      }),
    })),
    withMethods(store => ({
      changePosition(
        { id }: TPlayerStatisticFinal,
        position: EnumPlayerPosition,
      ): void {
        patchState(
          store,
          updateEntity({ id, changes: { position } }, STATISTIC_ENTITY_CONFIG),
        );
      },
      toggleIsMVP({ id }: TPlayerStatisticFinal): void {
        patchState(
          store,
          updateEntity(
            {
              id,
              changes: ({ isMVP }) => ({ isMVP: !isMVP }),
            },
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
      toggleIsCaptain({ id, teamId }: GamePlayerStatistic): void {
        patchState(
          store,
          updateEntities(
            {
              predicate: statistic => statistic.teamId === teamId,
              changes: {
                isCaptain: false,
              },
            },
            STATISTIC_ENTITY_CONFIG,
          ),
          updateEntity(
            { id, changes: { isCaptain: true } },
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },

      // Here we get actual transferable state at once
      toggleTransferable(statistic: GamePlayerStatistic): void {
        const { id, teamId, playerId, isTransfer } = statistic;

        if (!isTransfer) {
          const statisticsWithThisPlayerIdLength = store
            .statisticsEntities()
            .filter(stat => stat.playerId === playerId).length;

          // Transferable false mean:
          switch (statisticsWithThisPlayerIdLength) {
            // If in statistics array only one player - set transferable false
            case 1:
              return patchState(
                store,
                updateEntity(
                  {
                    id: statistic.id,
                    changes: { isTransfer: false },
                  },
                  STATISTIC_ENTITY_CONFIG,
                ),
              );
            case 2:
              // If in statistics array only one player - remove current and set second transferable false

              return patchState(
                store,
                removeEntity(id, STATISTIC_ENTITY_CONFIG),
                updateEntities(
                  {
                    predicate: statistic => statistic.playerId === playerId,
                    changes: { isTransfer: false },
                  },
                  STATISTIC_ENTITY_CONFIG,
                ),
              );
            default:
              throw new Error(
                'Not implemented for statistics more than 2 players',
              );
          }
        }

        // Update current and add new one
        const teams = store.teamsEntities() as [TTeamFinal, TTeamFinal];
        const oppositeTeamId = getOppositeTeamId(teamId, teams);
        const oppositeId = generatePlayerStatisticID({
          teamId: oppositeTeamId,
          playerId,
        });

        patchState(
          store,
          updateEntity(
            {
              id,
              changes: { isTransfer: true },
            },
            STATISTIC_ENTITY_CONFIG,
          ),
          addEntity(
            {
              ...statistic,
              id: oppositeId,
              teamId: oppositeTeamId,
              isCaptain: false,
              isTransfer: true,
            },
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },

      patchNumberKeysStatistics({
        statistic,
        number,
        key,
      }: {
        statistic: GamePlayerStatistic;
        number: number;
        key: TPlayerStatisticFinalNumberKeys;
      }): void {
        patchState(
          store,
          updateEntity(
            {
              id: statistic.id,
              changes: {
                [key]: statistic[key] + number,
              },
            },
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
      addStatisticPlayer(statistic: TPlayerStatisticFinal): void {
        patchState(
          store,
          addEntity(
            {
              ...statistic,
              id: generatePlayerStatisticID(statistic),
              isTransfer: false,
            },
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
      removeStatisticPlayer(id: string) {
        patchState(store, removeEntity(id, STATISTIC_ENTITY_CONFIG));
      },
      getStatististicsDTOs(): IPlayerStatisticDTO[] {
        return mapStatisticsFinaltoDTO(store.statisticsEntities());
      },
      initEntityStatistics(statistics: TPlayerStatisticFinal[]): void {
        patchState(
          store,
          setAllEntities(
            statistics.map(mapStatisticDTOtoFinal),
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
      swapStatistics(): void {
        const teams = store.teamsEntities() as [TTeamFinal, TTeamFinal];

        if (
          store.statisticsBMW().length < 1 ||
          store.statisticsHONDA().length < 1
        ) {
          return;
        }

        const bmwIdOpposite = getOppositeTeamId(
          store.statisticsBMW().at(0)!.teamId,
          teams,
        );
        const hondaIdOpposite = getOppositeTeamId(
          store.statisticsHONDA().at(0)!.teamId!,
          teams,
        );

        const bmwToHonda = store
          .statisticsBMW()
          .map(stat => ({ ...stat, teamId: bmwIdOpposite }))
          .map(stat => ({ ...stat, id: generatePlayerStatisticID(stat) }));
        const hondaToBmw = store
          .statisticsHONDA()
          .map(stat => ({ ...stat, teamId: hondaIdOpposite }))
          .map(stat => ({ ...stat, id: generatePlayerStatisticID(stat) }));

        patchState(
          store,
          removeAllEntities(STATISTIC_ENTITY_CONFIG),
          setAllEntities(
            [...bmwToHonda, ...hondaToBmw],
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
      updateAllStatisticsByTeam({
        teamId,
        statistics,
      }: {
        teamId: string;
        statistics: TPlayerStatisticFinal[];
      }): void {
        const filteredStatistics = store
          .statisticsEntities()
          .filter(stat => stat.teamId !== teamId);

        patchState(
          store,
          setAllEntities(
            [...filteredStatistics, ...statistics],
            STATISTIC_ENTITY_CONFIG,
          ),
        );
      },
    })),
    withHooks({
      onInit() {
        console.info(FEATURE_INITIALIZED);
      },
      onDestroy() {
        console.info(FEATURE_DESTROYED);
      },
    }),
  );
}
