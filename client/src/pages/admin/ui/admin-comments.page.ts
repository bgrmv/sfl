import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommentsService } from '@entities/comment';
import type { CommentDTO } from '@sfl/schemas';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';
import { KIT } from '@shared/ui/kit';

/**
 * Moderation of comments (S10.22). LIVE (admin.comments): the queue of comments
 * that wait, approve, reject, delete. The text is shown as plain text.
 */
@Component({
  selector: 'sfl-admin-comments-page',
  imports: [...KIT],
  providers: [CommentsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'admin.comments'"
    >
      <sfl-page-head
        title="Comments"
        lead="Comments wait here until you approve them. Visitors see only the approved ones."
      />
      <sfl-card
        flag="admin.comments"
        [title]="'Waiting for review · ' + queue().length"
      >
        @if (loading()) {
          <sfl-state kind="loading" />
        } @else if (!queue().length) {
          <sfl-state
            title="The queue is empty"
            text="New comments from visitors appear here."
          />
        } @else {
          <ul class="k-list">
            @for (c of queue(); track c.id) {
              <li>
                <div class="k-grow">
                  <b>{{ c.name }}</b>
                  <span class="k-muted k-small">{{ when(c) }}</span>
                  <div class="text">{{ c.text }}</div>
                </div>
                <button
                  sflBtn
                  size="sm"
                  type="button"
                  (click)="verdict(c, 'approved')"
                >
                  Approve
                </button>
                <button
                  sflBtn
                  size="sm"
                  variant="ghost"
                  type="button"
                  (click)="verdict(c, 'rejected')"
                >
                  Reject
                </button>
                <button
                  sflBtn
                  size="sm"
                  variant="danger"
                  type="button"
                  (click)="remove(c)"
                >
                  Delete
                </button>
              </li>
            }
          </ul>
        }
        <p class="k-hint">
          The text is plain text, links are not active. The public list has no
          e-mail and no account of the author.
        </p>
      </sfl-card>
    </div>
  `,
  styles: `
    .text {
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
  `,
})
export class AdminCommentsPageComponent {
  private readonly service = inject(CommentsService);
  private readonly notify = injectNotifier();

  protected readonly queue = signal<CommentDTO[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.service
      .queue()
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        result.match({
          ok: list => this.queue.set(list),
          err: error => this.notify.error(error),
        });
      });
  }

  protected when(comment: CommentDTO): string {
    return comment.createdAt
      ? ` · ${new Date(comment.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : '';
  }

  protected verdict(comment: CommentDTO, status: 'approved' | 'rejected') {
    this.service
      .moderate(comment.id, { status })
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: () => {
            this.queue.update(list => list.filter(c => c.id !== comment.id));
            this.notify.success(
              status === 'approved' ? 'Comment approved' : 'Comment rejected',
            );
          },
          err: error => this.notify.error(error),
        }),
      );
  }

  protected remove(comment: CommentDTO) {
    this.service
      .delete(comment.id)
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: () => {
            this.queue.update(list => list.filter(c => c.id !== comment.id));
            this.notify.success('Comment deleted');
          },
          err: error => this.notify.error(error),
        }),
      );
  }
}
