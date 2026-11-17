// The description of the API for OpenAPI 3.0, made from the same zod schemas that
// the client and the server validate with (S3.19, ADR 0018): the schema is the
// source, the document is derived and never written by hand.
import * as z from 'zod/mini';

import { apiErrorSchema } from './api-response.js';
import {
  commentInputSchema,
  commentModerationSchema,
  commentSchema,
  gameInputSchema,
  gameRevokeSchema,
  gameSchema,
  gameUpdateInputSchema,
  mediaInputSchema,
  mediaSchema,
  playerSchema,
  signInSchema,
  teamInputSchema,
  teamSchema,
} from './schemas.js';

/** What the API answers on a failure (`Result` with `ok: false`). */
export const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: apiErrorSchema,
});

/** Name in `components.schemas` → schema and the side it describes. */
const COMPONENTS = {
  Player: { schema: playerSchema, io: 'output' },
  Game: { schema: gameSchema, io: 'output' },
  Comment: { schema: commentSchema, io: 'output' },
  CommentInput: { schema: commentInputSchema, io: 'input' },
  CommentModeration: { schema: commentModerationSchema, io: 'input' },
  Media: { schema: mediaSchema, io: 'output' },
  MediaInput: { schema: mediaInputSchema, io: 'input' },
  Team: { schema: teamSchema, io: 'output' },
  GameInput: { schema: gameInputSchema, io: 'input' },
  GameRevoke: { schema: gameRevokeSchema, io: 'input' },
  GameUpdateInput: { schema: gameUpdateInputSchema, io: 'input' },
  TeamInput: { schema: teamInputSchema, io: 'input' },
  SignInInput: { schema: signInSchema, io: 'input' },
  ApiError: { schema: apiErrorSchema, io: 'output' },
  ErrorResponse: { schema: errorResponseSchema, io: 'output' },
} as const;

export type OpenApiComponentName = keyof typeof COMPONENTS;

/** `components.schemas` of the document, JSON Schema in the OpenAPI 3.0 dialect. */
export function openApiSchemas(): Record<OpenApiComponentName, object> {
  const out = {} as Record<OpenApiComponentName, object>;
  for (const [name, { schema, io }] of Object.entries(COMPONENTS)) {
    out[name as OpenApiComponentName] = z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      io,
      // The date is a string on the wire; no transform can be described
      unrepresentable: 'any',
    });
  }
  return out;
}

/** A `$ref` to a component, for `@ApiBody({ schema })` and responses. */
export function openApiRef(name: OpenApiComponentName): { $ref: string } {
  return { $ref: `#/components/schemas/${name}` };
}
