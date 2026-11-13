import { z } from 'zod';

// Stub of an admin test route
export const UpdateTestUsersDto = z
  .object({
    status: z.enum(['public', 'private']).default('private'),
    created: z.date().default(() => new Date()),
    size: z.string(),
  })
  .transform(input => ({
    ...input,
    size: Number(input.size),
  }));

export type UpdateTestUsersDtoInput = z.input<typeof UpdateTestUsersDto>;
export type UpdateTestUsersDtoOutput = z.output<typeof UpdateTestUsersDto>;

export const SetPasswordDTO = z.object({
  password: z.string().min(8).max(128),
});

export type SetPasswordDTOOutput = z.output<typeof SetPasswordDTO>;
