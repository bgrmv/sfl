import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { CaptainsStore, TCaptain } from '@entities/captains';

@Component({
  selector: 'sfl-captains-toggle',
  templateUrl: './captains-toggle.component.html',
  styleUrls: ['./captains-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
})
export class CaptainsToggleComponent implements AfterViewInit {
  private captainsStore = inject(CaptainsStore);

  readonly sort = viewChild.required(MatSort);

  constructor() {
    effect(() => {
      this.dataSource.data = this.captainsStore.captains();
    });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort();
  }

  readonly dataSource = new MatTableDataSource<TCaptain>([]);
  readonly displayedColumns: (keyof TCaptain | 'actions')[] = [
    'avatar',
    // 'name',
    // 'surname',
    'nickname',
    'actions',
  ];

  onToggle(id: string, event: MatSlideToggleChange) {
    this.captainsStore.toggleCaptain({ id, isCaptain: event.checked });
  }
}
