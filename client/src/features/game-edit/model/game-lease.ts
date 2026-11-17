import { DestroyRef, inject, Service, signal } from '@angular/core';
import { GameService } from '@entities/game';
import { exhaustMap, interval, merge, of, Subscription } from 'rxjs';
import { toResult } from '@shared/api/to-result';

/** The pulse that renews the lease (ADR 0015: 30 seconds for a lease of 2 minutes). */
export const PULSE_MS = 30_000;

export type LeaseState = 'none' | 'held' | 'busy';

/**
 * The lease of the game that is being edited (S10.54, ADR 0015). `start` takes it
 * and renews it with a pulse; when somebody else holds it the state is `busy`
 * with the name and the time, and the pulse keeps asking: the game that was freed
 * is taken at once and the state turns to `held`. `stop` releases it.
 */
@Service({ autoProvided: false })
export class GameLease {
  private readonly games = inject(GameService);

  readonly state = signal<LeaseState>('none');
  /** Who edits the game, when it is busy. */
  readonly owner = signal<string | null>(null);
  readonly until = signal<Date | null>(null);

  private id: string | null = null;
  private pulse: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(id: string) {
    if (this.id === id) return;
    this.stop();
    this.id = id;
    // The first ask is at once, then every pulse
    this.pulse = merge(of(0), interval(PULSE_MS))
      .pipe(exhaustMap(() => this.games.lock(id).pipe(toResult())))
      .subscribe(result =>
        result.match({
          ok: game => {
            this.state.set('held');
            this.owner.set(null);
            this.until.set(
              game.lock?.expiresAt ? new Date(game.lock.expiresAt) : null,
            );
          },
          err: error => {
            if (error.code === 'CONFLICT') {
              this.state.set('busy');
              const taken = /^(.+) is editing this game until (.+)$/.exec(
                error.message,
              );
              this.owner.set(taken?.[1] ?? 'Someone');
              this.until.set(taken ? new Date(taken[2]) : null);
            }
          },
        }),
      );
  }

  stop() {
    this.pulse?.unsubscribe();
    this.pulse = null;
    if (this.id && this.state() === 'held') {
      this.games.unlock(this.id).subscribe({ error: () => undefined });
    }
    this.id = null;
    this.state.set('none');
    this.owner.set(null);
    this.until.set(null);
  }
}
