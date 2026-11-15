import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { toResult } from './to-result';

const run = (source: Observable<unknown>) =>
  firstValueFrom(source.pipe(toResult()));

describe('toResult', () => {
  it('turns a value into a success', async () => {
    const result = await firstValueFrom(of(5).pipe(toResult()));
    expect(result.ok).toBe(true);
    expect(result.unwrapOr(0)).toBe(5);
  });

  it('takes the error of the API from the body of an error status', async () => {
    const error = { status: 404, code: 'NOT_FOUND', message: 'Game not found' };
    const result = await run(
      throwError(
        () =>
          new HttpErrorResponse({ status: 404, error: { ok: false, error } }),
      ),
    );
    expect(result.match({ ok: () => null, err: e => e })).toEqual(error);
  });

  it('describes a lost connection', async () => {
    const result = await run(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    expect(result.match({ ok: () => '', err: e => e.code })).toBe(
      'NETWORK_ERROR',
    );
  });

  it('accepts an ApiError thrown by the unwrapping of a response', async () => {
    const error = { status: 400, code: 'BAD_REQUEST', message: 'Bad' };
    const result = await run(throwError(() => error));
    expect(result.match({ ok: () => null, err: e => e.message })).toBe('Bad');
  });
});
