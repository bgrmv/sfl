import {
  gameRuleViolations,
  type EnumGameStatus,
  type GameToCheck,
} from '@sfl/schemas';

// The client has one more status than the API (`furture`, a placeholder card):
// it never reaches a form, so the rules treat it as a game that is not published

interface TeamToCheck {
  id: string;
  name: string;
}

type StatisticToCheck = GameToCheck['statistics'][number] & {
  // The player of the row, to name them in a message
  playerData?: { nickname?: string };
};

/**
 * The cross-field rules of a game (one captain per team, a position for every
 * player of a published game) are the ones the server checks: they come from
 * `@sfl/schemas`. This turns the broken rules into messages for the form, with
 * the name of the team or of the player.
 */
export function validateGameRules({
  status,
  teams,
  statistics,
}: {
  status: string;
  teams: TeamToCheck[];
  statistics: StatisticToCheck[];
}): Map<string, string> {
  const errors = new Map<string, string>();
  const teamName = (id?: string) =>
    teams.find(team => team.id === id)?.name ?? 'Unknown team';
  const playerName = (id?: string) =>
    statistics.find(stat => stat.playerId === id)?.playerData?.nickname ??
    'Unknown player';

  const violations = gameRuleViolations({
    status: status as EnumGameStatus,
    teams,
    statistics,
  });

  for (const { rule, teamId, playerId } of violations) {
    if (rule === 'captain') {
      // A team without players is reported as "must have a player" elsewhere
      if (!statistics.some(stat => stat.teamId === teamId)) {
        continue;
      }
      errors.set(
        `captain:${teamId}`,
        `Team ${teamName(teamId)} needs exactly one captain`,
      );
    } else if (rule === 'position') {
      errors.set(
        `position:${playerId}`,
        `${playerName(playerId)} needs a position: a published game requires it`,
      );
    } else {
      errors.set(
        `team:${playerId}`,
        `${playerName(playerId)} plays for a team that is not in the game`,
      );
    }
  }

  return errors;
}
