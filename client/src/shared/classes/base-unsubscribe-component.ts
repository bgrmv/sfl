import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({ changeDetection: ChangeDetectionStrategy.Eager, template: '' })
export class BaseUnsubscribeComponent implements OnDestroy {
  readonly unsubscribe$ = new Subject<void>();

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
