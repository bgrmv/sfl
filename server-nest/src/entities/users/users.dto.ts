import { z } from 'zod';

export const SetPasswordDTO = z.object({
  password: z.string().min(8).max(128),
});

export type SetPasswordDTOOutput = z.output<typeof SetPasswordDTO>;
