import { GameTeamCreateComponent } from './components/game-team-create/game-team-create.component';
import { GameService } from './services/game.service';
import { NewGameStore } from './model/game-form/new-game.store';

import { GameCreatePlayerStatisticsComponent } from './components/game-create-player-statistics/game-create-player-statistics.component';
import { GameListStatisticsPipe } from './directives/game-list-statistics.pipe';
import { GAMES_ROUTES } from './routes';
import { GamesStore } from './model/games-list/games.store';
import { TGameFinal } from './types';
import { GameCreationWidgetComponent } from './widgets/game-creation-widget/game-creation-widget.component';

export {
  GameCreatePlayerStatisticsComponent,
  // Widgets
  GameCreationWidgetComponent,
  // Pipes
  GameListStatisticsPipe,
  // Routes
  GAMES_ROUTES,
  // Services
  GameService,
  // Stores
  GamesStore,
  // Utils
  // Components [@deprecated]
  GameTeamCreateComponent,
  NewGameStore,
  // Types
  TGameFinal,
};
