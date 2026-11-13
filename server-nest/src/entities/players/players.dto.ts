import * as v from 'valibot';
import { EnumPlayerPosition } from './constants/player-career-metadata';
import { EnumPlayerStatus } from './players.schema';

export const RecalculateSeasonDTO = v.object({
  seasonId: v.number([v.integer(), v.minValue(2010)]),
  playerIds: v.array(v.string([v.toTrimmed(), v.minLength(1)]), [
    v.minLength(1),
  ]),
});

export type RecalculateSeasonDTOInput = v.Input<typeof RecalculateSeasonDTO>;
export type RecalculateSeasonDTOOutput = v.Output<typeof RecalculateSeasonDTO>;

// Whitelist of what PATCH /players/:id may change (S8.9). Other keys in the body
// (`roles`, `password`, `id`, `metadata`, ...) are dropped by the schema.
// The user to update is taken from the player, never from the body.
export const UpdatePlayerDTO = v.object({
  nickname: v.optional(v.string([v.toTrimmed(), v.minLength(1)])),
  number: v.optional(v.number([v.integer(), v.minValue(1), v.maxValue(999)])),
  isCaptain: v.optional(v.boolean()),
  status: v.optional(v.enum_(EnumPlayerStatus)),
  position: v.optional(v.enum_(EnumPlayerPosition)),
  user: v.optional(
    v.object({
      email: v.optional(v.string([v.toTrimmed(), v.email()])),
      name: v.optional(v.string([v.toTrimmed()])),
      surname: v.optional(v.string([v.toTrimmed()])),
      avatar: v.optional(v.string([v.toTrimmed()])),
      age: v.optional(v.number([v.integer(), v.minValue(0), v.maxValue(120)])),
    }),
  ),
});

export type UpdatePlayerDTOOutput = v.Output<typeof UpdatePlayerDTO>;

// POST /players: players are created together with their users
export const CreatePlayersDTO = v.array(
  v.object({
    nickname: v.string([v.toTrimmed(), v.minLength(1)]),
    number: v.optional(v.number([v.integer(), v.minValue(1), v.maxValue(999)])),
    user: v.object({
      email: v.string([v.toTrimmed(), v.email()]),
      name: v.optional(v.string([v.toTrimmed()])),
      surname: v.optional(v.string([v.toTrimmed()])),
    }),
  }),
  [v.minLength(1), v.maxLength(100)],
);

export type CreatePlayersDTOOutput = v.Output<typeof CreatePlayersDTO>;
