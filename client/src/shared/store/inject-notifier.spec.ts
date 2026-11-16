import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { injectNotifier } from './inject-notifier';

describe('injectNotifier', () => {
  const open = vi.fn();
  const notifier = () => TestBed.runInInjectionContext(() => injectNotifier());

  beforeEach(() => {
    open.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open } }],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows an error of the request that the screen has to explain', () => {
    const text = notifier().error({
      status: 409,
      code: 'CONFLICT',
      message: 'Taken',
    });

    expect(text).toBe('Taken');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: 0, code: 'NETWORK_ERROR', message: 'x' },
    { status: 503, code: 'INTERNAL_ERROR', message: 'x' },
  ] as const)(
    'does not show a global failure again (%j): the interceptor did',
    error => {
      const text = notifier().error(error);

      expect(text).toBeTruthy();
      expect(open).not.toHaveBeenCalled();
    },
  );
});
