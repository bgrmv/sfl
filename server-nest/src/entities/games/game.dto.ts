// One schema for the client and the server (@sfl/schemas): the fields, the
// transforms (`playedAt` becomes a Date, `null` text becomes '') and the rules
// of a game (one captain per team, a position for every player when published).
export {
  gameInputSchema as SaveGameDTO,
  gameUpdateInputSchema as UpdateGameDTO,
} from '@sfl/schemas';
