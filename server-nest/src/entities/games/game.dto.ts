import * as v from 'valibot';
import { EnumPlayerPosition } from '../players/constants/player-career-metadata';
import { TeamUpdateDTO } from '../teams/team.dto';
import { EnumGameStatus, IGame } from './game.schema';

export const SavePlayerStatisticDTO = v.object({
  playerId: v.string([v.toTrimmed()]), //mongoose.Schema.ObjectId
  teamId: v.string([v.toTrimmed()]), //  mongoose.Schema.ObjectId
  goalsByLeg: v.number([v.integer(), v.minValue(0)]),
  goalsByHead: v.number([v.integer(), v.minValue(0)]),
  goalsByAuto: v.number([v.integer(), v.minValue(0)]),
  goalsByPenalty: v.number([v.integer(), v.minValue(0)]),
  passes: v.number([v.integer(), v.minValue(0)]),
  isMVP: v.boolean(),
  isTransfer: v.boolean(),
  isCaptain: v.boolean(),
  position: v.union([v.enum_(EnumPlayerPosition), v.null_()]),
});

const GameBaseDTO = {
  number: v.number([v.integer(), v.minValue(1), v.maxValue(53)]),
  season: v.number([v.integer(), v.minValue(2010)]),
  playedAt: v.string([v.isoTimestamp()]),
  status: v.enum_(EnumGameStatus),
  teams: v.tuple([TeamUpdateDTO, TeamUpdateDTO]),
  link: v.string([v.toTrimmed()]),
  description: v.string([v.toTrimmed()]),
  notes: v.tuple([v.string([v.toTrimmed()]), v.string([v.toTrimmed()])]),
  statistics: v.array(SavePlayerStatisticDTO),
  metadata: v.any(),
};

// id: v.string([v.toTrimmed(), v.uuid()]),

export const SaveGameDTO = v.transform(
  v.object({
    ...GameBaseDTO,
  }),
  (input): Omit<IGame, 'id'> => ({
    ...input,
    playedAt: new Date(input.playedAt),
    statistics: input.statistics.map(s => ({
      ...s,
      position: s.position ?? null,
    })),
  }),
);

export const UpdateGameDTO = v.transform(
  v.object({
    id: v.string([v.toTrimmed()]),
    ...GameBaseDTO,
  }),
  input => ({
    ...input,
  }),
);

export type SaveGameDTOInput = v.Input<typeof SaveGameDTO>;
export type SaveGameDTOOutput = v.Output<typeof SaveGameDTO>;

export type UpdateGameDTOInput = v.Input<typeof SaveGameDTO>;
