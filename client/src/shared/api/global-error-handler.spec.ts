import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  const open = vi.fn();
  let handler: ErrorHandler;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    open.mockReset();
    log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    handler = TestBed.inject(ErrorHandler);
  });

  afterEach(() => vi.restoreAllMocks());

  it('logs an unexpected error and tells the person', () => {
    const error = new Error('boom');
    handler.handleError(error);

    expect(log).toHaveBeenCalledWith(error);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain('Something went wrong');
  });

  it('does not repeat the notification of an HTTP error', () => {
    handler.handleError(new HttpErrorResponse({ status: 500 }));

    expect(log).toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('shows one notification for a burst of errors', () => {
    handler.handleError(new Error('a'));
    handler.handleError(new Error('b'));
    handler.handleError(new Error('c'));

    expect(open).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(3);
  });
});
