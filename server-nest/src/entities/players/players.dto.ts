import { EnumPlayerPosition, EnumPlayerStatus } from '@sfl/schemas';
import { z } from 'zod';

export const RecalculateSeasonDTO = z.object({
  seasonId: z.number().int().min(2010),
  playerIds: z.array(z.string().trim().min(1)).min(1),
});

// `apply` is the explicit flag to write the calculated values (S3.27);
// without it the endpoint only reports the differences.
export const RecalculateFullSeasonDTO = z.object({
  seasonId: z.number().int().min(2010),
  apply: z.boolean().default(false),
});

export type RecalculateFullSeasonDTOOutput = z.output<
  typeof RecalculateFullSeasonDTO
>;

export type RecalculateSeasonDTOInput = z.input<typeof RecalculateSeasonDTO>;
export type RecalculateSeasonDTOOutput = z.output<typeof RecalculateSeasonDTO>;

// `YYYY-MM-DD`, not before 1900 and not in the future; stored as midnight UTC
const birthDateSchema = z.iso
  .date()
  .transform(day => new Date(`${day}T00:00:00.000Z`))
  .refine(
    date =>
      date.getTime() >= Date.UTC(1900, 0, 1) && date.getTime() <= Date.now(),
    'A birth date between 1900 and today',
  );

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
      // `null` clears the value: many dates are lost for good (S3.33)
      birthDate: birthDateSchema.nullable().optional(),
      country: z
        .string()
        .regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2, upper case')
        .nullable()
        .optional(),
    })
    .optional(),
});

export type UpdatePlayerDTOOutput = z.output<typeof UpdatePlayerDTO>;

// POST /players: players are created together with their users
export const CreatePlayersDTO = z.object({
  players: z
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
    .max(100),
});

export type CreatePlayersDTOOutput = z.output<typeof CreatePlayersDTO>;
