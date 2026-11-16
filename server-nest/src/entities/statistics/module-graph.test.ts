import { describe, expect, it } from 'vitest';

import { GamesModule } from '../games/games.module';
import { PlayersModule } from '../players/players.module';
import { PlayersService } from '../players/players.service';
import { PlayerMetadataService } from './player-metadata.service';
import { StatisticsModule } from './statistics.module';

const meta = (key: string, module: object): unknown[] =>
  Reflect.getMetadata(key, module) ?? [];

describe('games and players modules (S3.3)', () => {
  it('have no circular import: both depend on StatisticsModule only', () => {
    expect(meta('imports', GamesModule)).toContain(StatisticsModule);
    expect(meta('imports', PlayersModule)).toContain(StatisticsModule);
    expect(meta('imports', GamesModule)).not.toContain(PlayersModule);
    expect(meta('imports', PlayersModule)).not.toContain(GamesModule);
    expect(meta('imports', StatisticsModule)).not.toContain(GamesModule);
  });

  it('use no forwardRef', () => {
    const forwardRefs = [GamesModule, PlayersModule, StatisticsModule].flatMap(
      module =>
        meta('imports', module).filter(
          item => typeof item === 'object' && item && 'forwardRef' in item,
        ),
    );
    expect(forwardRefs).toEqual([]);
  });

  it('keep PlayersService only in PlayersModule', () => {
    expect(meta('providers', GamesModule)).not.toContain(PlayersService);
    expect(meta('providers', PlayersModule)).toContain(PlayersService);
    expect(meta('exports', StatisticsModule)).toContain(PlayerMetadataService);
  });
});
