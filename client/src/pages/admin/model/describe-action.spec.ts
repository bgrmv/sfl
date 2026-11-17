import { describe, expect, it } from 'vitest';
import { describeAction } from './describe-action';

describe('describeAction', () => {
  it.each([
    ['POST', '/rest/games', 'created a game'],
    ['PATCH', '/rest/games/:id', 'changed a game'],
    ['PUT', '/rest/games/:id', 'changed a game'],
    ['DELETE', '/rest/games/:id', 'deleted a game'],
    ['POST', '/rest/media', 'created a photo'],
    ['PATCH', '/rest/comments/:id', 'moderated a comment'],
    ['DELETE', '/rest/comments/:id', 'deleted a comment'],
    ['POST', '/rest/players/:id/anonymize', 'anonymized a player'],
    ['POST', '/rest/players/recalculations/full', 'recalculated statistics'],
    ['PUT', '/rest/users/:id/password', 'set a password'],
  ])('%s %s is "%s"', (method, route, words) => {
    expect(describeAction(method, route)).toBe(words);
  });

  it('an unknown route stays as it is, so nothing is hidden', () => {
    expect(describeAction('POST', '/rest/unknown')).toBe('POST /rest/unknown');
  });
});
