import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { CaptainsToggleComponent } from '@features/captain-toggle';

@Component({
  selector: 'sfl-captains-admin-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTabsModule,

    // Feature
    CaptainsToggleComponent,
  ],
  templateUrl: './captains-admin-widget.component.html',
  styleUrls: ['./captains-admin-widget.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaptainsAdminWidgetComponent {}
