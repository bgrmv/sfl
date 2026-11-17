import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nilToDash',
  standalone: true,
})
export class NilToDashPipe implements PipeTransform {
  transform<T>(value: T): NonNullable<T> | '—' {
    if (value === null || value === undefined) {
      return '—';
    }
    return value as NonNullable<T>;
  }
}
