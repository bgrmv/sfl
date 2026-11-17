import { describe, expect, it } from 'vitest';
import type { Route } from '@angular/router';
import { routes } from './app.routes';

const flatten = (rs: Route[]): Route[] =>
  rs.flatMap(r => [r, ...flatten(r.children ?? [])]);

describe('app routes', () => {
  it(
    'every lazy design route resolves to a component',
    { timeout: 60000 },
    async () => {
      const lazy = flatten(routes).filter(r => r.loadComponent);
      expect(lazy.length).toBeGreaterThan(30);
      for (const r of lazy) {
        const c = await r.loadComponent!();
        expect(c, r.path).toBeTruthy();
      }
    },
  );

  it('the admin area is behind the guard', () => {
    const admin = routes.find(r => r.path === 'admin');
    expect(admin?.canActivate?.length).toBe(1);
  });

  it('keeps the unknown url on the not found page', () => {
    expect(routes.at(-1)?.path).toBe('**');
  });
});
