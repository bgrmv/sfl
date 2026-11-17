import { TestBed } from '@angular/core/testing';
import type { CommentDTO } from '@sfl/schemas';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CommentsService } from '../api/comments.service';
import { GameCommentsComponent } from './game-comments.component';

const comment = (over: Partial<CommentDTO> = {}): CommentDTO => ({
  id: 'c1',
  gameId: 'g1',
  name: 'Viper',
  text: 'Great game',
  status: 'approved',
  createdAt: '2026-11-15T10:12:00.000Z',
  ...over,
});

function setup(list: CommentDTO[], create = vi.fn()) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(GameCommentsComponent, {
    set: {
      providers: [
        {
          provide: CommentsService,
          useValue: { find: vi.fn(() => of(list)), create },
        },
      ],
    },
  });
  const fixture = TestBed.createComponent(GameCommentsComponent);
  fixture.componentRef.setInput('gameId', 'g1');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const type = (selector: string, value: string) => {
    const field = el.querySelector(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    // A browser renders after every event
    fixture.detectChanges();
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return { fixture, el, type, submit };
}

describe('GameCommentsComponent', () => {
  it('shows the approved comments and says so when there are none', () => {
    expect(setup([comment()]).el.textContent).toContain('Great game');
    expect(setup([]).el.textContent).toContain('No comments yet.');
  });

  it('shows tags and links as plain text, never as markup', () => {
    const { el } = setup([
      comment({ name: '<i>x</i>', text: '<b>bold</b> https://spam.example' }),
    ]);

    expect(el.querySelector('b b')).toBeNull();
    expect(el.querySelector('a')).toBeNull();
    expect(el.textContent).toContain('<b>bold</b> https://spam.example');
  });

  it('sends the name and the text, clears the text and tells that it waits for the review', () => {
    const create = vi.fn(() => of(comment({ status: 'pending' })));
    const { el, type, submit } = setup([], create);

    type('input.k-input', 'Pike');
    type('textarea', 'Rematch on Saturday?');
    submit();

    expect(create).toHaveBeenCalledWith({
      gameId: 'g1',
      name: 'Pike',
      text: 'Rematch on Saturday?',
    });
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      '',
    );
    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'after the administrator checks it',
    );
  });

  it('shows the reason when the server refuses and keeps the text', () => {
    const create = vi.fn(() =>
      throwError(() => ({
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
      })),
    );
    const { el, type, submit } = setup([], create);
    type('textarea', 'Hello again');
    submit();

    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.querySelector('[role="status"]')).toBeNull();
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      'Hello again',
    );
  });
});
