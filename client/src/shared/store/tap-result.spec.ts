import { err, ok } from '@sfl/schemas';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { tapResult } from './tap-result';

const error = { status: 500, code: 'INTERNAL_ERROR', message: 'x' } as const;

describe('tapResult', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls ok for a value and err for a failure, passes the result on', () => {
    const handlers = { ok: vi.fn(), err: vi.fn() };
    const seen: unknown[] = [];

    of(ok(1), err(error))
      .pipe(tapResult<number>(handlers))
      .subscribe(result => seen.push(result));

    expect(handlers.ok).toHaveBeenCalledWith(1);
    expect(handlers.err).toHaveBeenCalledWith(error);
    expect(seen).toHaveLength(2);
  });

  it('a handler that throws does not break the stream', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen: unknown[] = [];
    let failure: unknown = null;

    of(ok(1), ok(2))
      .pipe(
        tapResult<number>({
          ok: value => {
            if (value === 1) throw new Error('boom');
          },
          err: () => {},
        }),
      )
      .subscribe({
        next: result => seen.push(result),
        error: e => (failure = e),
      });

    expect(failure).toBeNull();
    expect(seen).toHaveLength(2);
    expect(console.error).toHaveBeenCalled();
  });
});
