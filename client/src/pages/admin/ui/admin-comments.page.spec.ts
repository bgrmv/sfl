import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommentsService } from '@entities/comment';
import type { CommentDTO } from '@sfl/schemas';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminCommentsPageComponent } from './admin-comments.page';

const comment = (id: string, text = 'Hello'): CommentDTO => ({
  id,
  gameId: 'g1',
  name: 'Pike',
  text,
  status: 'pending',
  createdAt: '2026-11-15T10:12:00.000Z',
});

function setup(queue: CommentDTO[]) {
  const service = {
    queue: vi.fn(() => of(queue)),
    moderate: vi.fn((id: string) => of({ ...comment(id), status: 'approved' })),
    delete: vi.fn(() => of(null)),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: MatSnackBar, useValue: { open: vi.fn() } }],
  });
  TestBed.overrideComponent(AdminCommentsPageComponent, {
    set: { providers: [{ provide: CommentsService, useValue: service }] },
  });
  const fixture = TestBed.createComponent(AdminCommentsPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (row: number, label: string) =>
    [...el.querySelectorAll('li')[row].querySelectorAll('button')].find(b =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement;
  return { fixture, el, service, button };
}

describe('AdminCommentsPageComponent', () => {
  it('lists the queue as plain text and says so when it is empty', () => {
    const { el } = setup([comment('a', '<b>x</b> http://spam.example')]);
    expect(el.textContent).toContain('<b>x</b> http://spam.example');
    expect(el.querySelector('li a')).toBeNull();

    expect(setup([]).el.textContent).toContain('The queue is empty');
  });

  it('approve and reject send the verdict and take the comment out of the queue', () => {
    const { fixture, el, service, button } = setup([
      comment('a'),
      comment('b'),
    ]);

    button(0, 'Approve').click();
    fixture.detectChanges();
    expect(service.moderate).toHaveBeenCalledWith('a', { status: 'approved' });
    expect(el.querySelectorAll('li')).toHaveLength(1);

    button(0, 'Reject').click();
    fixture.detectChanges();
    expect(service.moderate).toHaveBeenLastCalledWith('b', {
      status: 'rejected',
    });
    expect(el.textContent).toContain('The queue is empty');
  });

  it('delete removes the comment from the queue', () => {
    const { fixture, el, service, button } = setup([comment('a')]);

    button(0, 'Delete').click();
    fixture.detectChanges();

    expect(service.delete).toHaveBeenCalledWith('a');
    expect(el.querySelectorAll('li')).toHaveLength(0);
  });
});
