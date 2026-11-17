import { inject, Service, signal } from '@angular/core';
import { CommentsService } from '@entities/comment';
import type { CommentDTO } from '@sfl/schemas';
import { toResult } from '@shared/api/to-result';
import { injectNotifier } from '@shared/store/inject-notifier';

/**
 * The comments that wait for a verdict, shared by the sidebar (the count), the
 * overview (the first ones) and the page of comments (all of them), so a verdict
 * in one place changes the others.
 */
@Service()
export class AdminCommentsQueue {
  private readonly service = inject(CommentsService);
  private readonly notify = injectNotifier();

  readonly queue = signal<CommentDTO[]>([]);
  readonly loading = signal(true);
  private loaded = false;

  /** Loads once; a later call changes nothing. */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.service
      .queue()
      .pipe(toResult())
      .subscribe(result => {
        this.loading.set(false);
        result.match({
          ok: list => this.queue.set(list),
          err: error => {
            this.loaded = false;
            this.notify.error(error);
          },
        });
      });
  }

  verdict(comment: CommentDTO, status: 'approved' | 'rejected') {
    this.service
      .moderate(comment.id, { status })
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: () => {
            this.drop(comment.id);
            this.notify.success(
              status === 'approved' ? 'Comment approved' : 'Comment rejected',
            );
          },
          err: error => this.notify.error(error),
        }),
      );
  }

  remove(comment: CommentDTO) {
    this.service
      .delete(comment.id)
      .pipe(toResult())
      .subscribe(result =>
        result.match({
          ok: () => {
            this.drop(comment.id);
            this.notify.success('Comment deleted');
          },
          err: error => this.notify.error(error),
        }),
      );
  }

  private drop(id: string) {
    this.queue.update(list => list.filter(c => c.id !== id));
  }
}
