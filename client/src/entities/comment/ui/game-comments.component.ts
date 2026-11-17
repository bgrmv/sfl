import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { COMMENT_TEXT_MAX, type CommentDTO } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { toResult } from '@shared/api/to-result';
import { catchError, of, switchMap } from 'rxjs';
import { CommentsService } from '../api/comments.service';

/**
 * The comments of a game: the approved ones as plain text (the template
 * interpolates, so tags and links stay text) and a form. A new comment waits for
 * the review of the administrator, the visitor is told so.
 */
@Component({
  selector: 'sfl-game-comments',
  providers: [CommentsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (comments().length) {
      <ul class="k-list">
        @for (c of comments(); track c.id) {
          <li>
            <div>
              <b>{{ c.name }}</b>
              <span class="k-muted k-small">{{ when(c) }}</span>
              <div class="text">{{ c.text }}</div>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="k-muted">No comments yet.</p>
    }

    <form
      class="k-col"
      (submit)="$event.preventDefault(); send()"
    >
      <div class="k-field">
        <label [attr.for]="id + '-name'">Name</label>
        <input
          [id]="id + '-name'"
          class="k-input"
          maxlength="40"
          autocomplete="nickname"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
        />
      </div>
      <div class="k-field">
        <label [attr.for]="id + '-text'">Comment</label>
        <textarea
          [id]="id + '-text'"
          class="k-textarea"
          [attr.maxlength]="max"
          [value]="text()"
          (input)="text.set($any($event.target).value)"
        ></textarea>
      </div>
      @if (error(); as message) {
        <p
          class="k-hint"
          role="alert"
        >
          {{ message }}
        </p>
      }
      @if (sent()) {
        <p
          class="k-hint"
          role="status"
        >
          Thank you. Your comment will appear after the administrator checks it.
        </p>
      }
      <button
        sflBtn
        type="submit"
        [disabled]="sending()"
      >
        {{ sending() ? 'Sending…' : 'Send for review' }}
      </button>
    </form>
  `,
  styles: `
    .text {
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
  `,
})
export class GameCommentsComponent {
  readonly gameId = input.required<string>();

  private readonly service = inject(CommentsService);
  protected readonly id = `comments-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly max = COMMENT_TEXT_MAX;

  protected readonly name = signal('');
  protected readonly text = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly comments = toSignal(
    toObservable(this.gameId).pipe(
      switchMap(id => this.service.find(id)),
      catchError(() => of([] as CommentDTO[])),
    ),
    { initialValue: [] as CommentDTO[] },
  );

  protected when(comment: CommentDTO): string {
    return comment.createdAt
      ? ` · ${new Date(comment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      : '';
  }

  protected send() {
    if (this.sending()) return;
    this.sending.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.service
      .create({
        gameId: this.gameId(),
        name: this.name(),
        text: this.text(),
      })
      .pipe(toResult())
      .subscribe(result => {
        this.sending.set(false);
        result.match({
          ok: () => {
            this.text.set('');
            this.sent.set(true);
          },
          err: error => this.error.set(apiErrorMessage(error)),
        });
      });
  }
}
