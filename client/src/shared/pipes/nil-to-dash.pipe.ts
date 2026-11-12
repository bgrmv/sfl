import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nilToDash',
  standalone: true,
})
export class NilToDashPipe implements PipeTransform {
  transform(value: any): unknown {
    if (value === null || value === undefined) {
      return '—';
    }
    return value;
  }
}
