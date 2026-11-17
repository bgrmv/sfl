import { describe, expect, it } from 'vitest';

import { GameSchema } from './game.schema';

describe('GameSchema indexes (S12.4)', () => {
  const indexes = GameSchema.indexes().map(([fields, options]) => ({
    fields,
    unique: options?.unique === true,
  }));

  it('a game is unique by number and season', () => {
    expect(indexes).toContainEqual({
      fields: { number: 1, season: 1 },
      unique: true,
    });
  });

  it('has an index for the games of a season and for the games of a player', () => {
    expect(indexes).toContainEqual({ fields: { season: 1 }, unique: false });
    expect(indexes).toContainEqual({
      fields: { 'statistics.playerId': 1 },
      unique: false,
    });
  });

  it('has no single index on the number: the compound one starts with it', () => {
    expect(indexes).not.toContainEqual({
      fields: { number: 1 },
      unique: false,
    });
  });
});
