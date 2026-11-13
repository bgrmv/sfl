import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, OnInit, AfterViewInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class CaptainsToggleComponent implements OnInit, AfterViewInit {
  private _destroyRef = inject(DestroyRef);
  private captainsStore = inject(CaptainsStore);


  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.captainsStore.captains$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(captains => {
        this.dataSource.data = captains;
      });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
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
