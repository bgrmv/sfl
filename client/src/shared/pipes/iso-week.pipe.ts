import { Pipe, PipeTransform } from '@angular/core';
import { getISOWeek, isDate } from 'date-fns';

@Pipe({
  name: 'ISOWeek',
  standalone: true,
})
export class ISOWeekPipe implements PipeTransform {
  transform(value?: Date | null): unknown {
    return isDate(value) ? getISOWeek(value) : null;
  }
}
