import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommentsService } from '@entities/comment';
import type { CommentDTO } from '@sfl/schemas';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCommentsQueue } from './comments-queue';

const comment = (id: string): CommentDTO => ({
  id,
  gameId: 'g1',
  name: 'Pike',
  text: 'Hello',
  status: 'pending',
});

describe('AdminCommentsQueue', () => {
  const service = {
    queue: vi.fn(),
    moderate: vi.fn(),
    delete: vi.fn(),
  };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const fn of [...Object.values(service), snackBar.open]) fn.mockReset();
    service.queue.mockReturnValue(of([comment('a'), comment('b')]));
    TestBed.configureTestingModule({
      providers: [
        { provide: CommentsService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
  });

  it('loads the queue once, however many places ask for it', () => {
    const queue = TestBed.inject(AdminCommentsQueue);

    queue.load();
    queue.load();

    expect(service.queue).toHaveBeenCalledTimes(1);
    expect(queue.queue().map(c => c.id)).toEqual(['a', 'b']);
    expect(queue.loading()).toBe(false);
  });

  it('a verdict takes the comment out of the one list everybody reads', () => {
    service.moderate.mockReturnValue(of(comment('a')));
    const queue = TestBed.inject(AdminCommentsQueue);
    queue.load();

    queue.verdict(queue.queue()[0], 'approved');

    expect(service.moderate).toHaveBeenCalledWith('a', { status: 'approved' });
    expect(queue.queue().map(c => c.id)).toEqual(['b']);
  });

  it('a refused verdict keeps the comment and tells so', () => {
    service.moderate.mockReturnValue(throwError(() => new Error('no')));
    const queue = TestBed.inject(AdminCommentsQueue);
    queue.load();

    queue.verdict(queue.queue()[0], 'rejected');

    expect(queue.queue()).toHaveLength(2);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('delete takes the comment out too', () => {
    service.delete.mockReturnValue(of(null));
    const queue = TestBed.inject(AdminCommentsQueue);
    queue.load();

    queue.remove(queue.queue()[1]);

    expect(queue.queue().map(c => c.id)).toEqual(['a']);
  });

  it('a failed load can be tried again', () => {
    service.queue.mockReturnValueOnce(throwError(() => new Error('down')));
    const queue = TestBed.inject(AdminCommentsQueue);

    queue.load();
    expect(queue.loading()).toBe(false);
    queue.load();

    expect(service.queue).toHaveBeenCalledTimes(2);
    expect(queue.queue()).toHaveLength(2);
  });
});
