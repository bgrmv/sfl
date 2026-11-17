const NOUNS: [prefix: string, noun: string][] = [
  ['/rest/games', 'a game'],
  ['/rest/players/recalculations', 'statistics'],
  ['/rest/players', 'a player'],
  ['/rest/media', 'a photo'],
  ['/rest/comments', 'a comment'],
  ['/rest/teams', 'a team'],
  ['/rest/roles', 'a role'],
  ['/rest/users', 'a user'],
  ['/rest/migrations', 'data'],
];

/**
 * A line of the action log in words: "created a game", "approved or rejected a
 * comment". The route is the pattern the server logged, never an id.
 */
export function describeAction(method: string, route: string): string {
  const noun = NOUNS.find(([prefix]) => route.startsWith(prefix))?.[1];
  if (!noun) return `${method} ${route}`;

  if (route.endsWith('/anonymize')) return `anonymized ${noun}`;
  if (route.includes('/recalculations')) return 'recalculated statistics';
  if (route.endsWith('/password')) return 'set a password';
  if (route.startsWith('/rest/comments') && method === 'PATCH') {
    return 'moderated a comment';
  }

  switch (method) {
    case 'POST':
      return `created ${noun}`;
    case 'PUT':
    case 'PATCH':
      return `changed ${noun}`;
    case 'DELETE':
      return `deleted ${noun}`;
    default:
      return `${method} ${route}`;
  }
}
