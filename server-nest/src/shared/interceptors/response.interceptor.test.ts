import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

const wrap = (value: unknown) =>
  firstValueFrom(
    new ResponseInterceptor().intercept(
      {} as ExecutionContext,
      {
        handle: () => of(value),
      } as CallHandler,
    ),
  );

describe('ResponseInterceptor', () => {
  it('wraps a value into { ok: true, data }', async () => {
    expect(await wrap([{ id: 1 }])).toEqual({ ok: true, data: [{ id: 1 }] });
  });

  it('answers { ok: true, data: null } for a missing value', async () => {
    expect(await wrap(undefined)).toEqual({ ok: true, data: null });
    expect(await wrap(null)).toEqual({ ok: true, data: null });
  });

  it('keeps falsy values such as 0 and an empty string', async () => {
    expect(await wrap(0)).toEqual({ ok: true, data: 0 });
    expect(await wrap('')).toEqual({ ok: true, data: '' });
  });
});
