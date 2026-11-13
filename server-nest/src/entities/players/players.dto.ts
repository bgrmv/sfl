import { EnumPlayerPosition, EnumPlayerStatus } from '@sfl/schemas';
import { z } from 'zod';

export const RecalculateSeasonDTO = z.object({
  seasonId: z.number().int().min(2010),
  playerIds: z.array(z.string().trim().min(1)).min(1),
});

export type RecalculateSeasonDTOInput = z.input<typeof RecalculateSeasonDTO>;
export type RecalculateSeasonDTOOutput = z.output<typeof RecalculateSeasonDTO>;

// Whitelist of what PATCH /players/:id may change (S8.9). Other keys in the body
// (`roles`, `password`, `id`, `metadata`, ...) are dropped by the schema.
// The user to update is taken from the player, never from the body.
export const UpdatePlayerDTO = z.object({
  nickname: z.string().trim().min(1).optional(),
  number: z.number().int().min(1).max(999).optional(),
  isCaptain: z.boolean().optional(),
  status: z.enum(EnumPlayerStatus).optional(),
  position: z.enum(EnumPlayerPosition).optional(),
  user: z
    .object({
      email: z.email().trim().optional(),
      name: z.string().trim().optional(),
      surname: z.string().trim().optional(),
      avatar: z.string().trim().optional(),
      age: z.number().int().min(0).max(120).optional(),
    })
    .optional(),
});

export type UpdatePlayerDTOOutput = z.output<typeof UpdatePlayerDTO>;

// POST /players: players are created together with their users
export const CreatePlayersDTO = z
  .array(
    z.object({
      nickname: z.string().trim().min(1),
      number: z.number().int().min(1).max(999).optional(),
      user: z.object({
        email: z.email().trim(),
        name: z.string().trim().optional(),
        surname: z.string().trim().optional(),
      }),
    }),
  )
  .min(1)
  .max(100);

export type CreatePlayersDTOOutput = z.output<typeof CreatePlayersDTO>;
