import { describe, expect, it } from 'vitest';

import { ValibotValidationPipe } from '../../shared/pipes/custom-pipe/valibot-validation.pipe';
import { SaveGameDTO, UpdateGameDTO } from './game.dto';
import { EnumGameStatus } from './game.schema';

// Shape of what the Angular client sends (IGameDTO serialized to JSON).
const team = (n: number) => ({
  id: `team${n}`,
  name: `Team ${n}`,
  color: 'RED',
  description: null,
  logo: null,
});

const clientGame = {
  number: 3,
  season: 2025,
  playedAt: new Date('2025-05-10T17:00:00.000Z').toISOString(),
  status: EnumGameStatus.Published,
  teams: [team(1), team(2)],
  link: '',
  description: '',
  notes: ['', ''],
  statistics: [],
};

describe('game DTOs accept client payloads', () => {
  it('POST/PUT body (SaveGameDTO) incl. extra id and no metadata', () => {
    const pipe = new ValibotValidationPipe(SaveGameDTO);
    expect(() => pipe.transform({ ...clientGame, id: 'x' })).not.toThrow();
  });

  it('PATCH body (UpdateGameDTO)', () => {
    const pipe = new ValibotValidationPipe(UpdateGameDTO);
    expect(() => pipe.transform({ ...clientGame, id: 'x' })).not.toThrow();
  });
});
