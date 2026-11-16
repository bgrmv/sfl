import { TPlayerStatisticFinal } from '@entities/game';
import { TTeamFinal } from '@entities/team';

// What the form of a game needs before it can be saved. The rules of the
// league (one captain, a position) are in `game-rules.ts`, from @sfl/schemas.

export function validateTeamsAndStatistics({
  teams,
  statistics,
}: {
  teams: TTeamFinal[];
  statistics: TPlayerStatisticFinal[];
}): Map<string, string> {
  const errors = new Map<string, string>();
  const [teamA, teamB] = teams;

  if (!teamA) errors.set('teams:teamA:required', 'Team A is required');
  if (!teamB) errors.set('teams:teamB:required', 'Team B is required');
  if (!teamA || !teamB) return errors;

  for (const [key, team] of [
    ['teamA', teamA],
    ['teamB', teamB],
  ] as const) {
    if (!statistics.some(row => row.teamId === team.id)) {
      errors.set(
        `statistics:${key}:atleastOne`,
        `Team ${team.name} must have at least one player`,
      );
    }
  }

  return errors;
}
