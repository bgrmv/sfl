import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { PlayersService, PlayersStore } from '@entities/player';
import { CaptainsTableComponent } from '@features/captain-table';
import { CaptainsToggleComponent } from '@features/captain-toggle';
import { CaptainsAdminWidgetComponent } from '../captains-admin-widget/captains-admin-widget.component';

@Component({
  selector: 'sfl-captains-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTabsModule,

    // Features
    CaptainsTableComponent,
    CaptainsToggleComponent,

    // Widgets
    CaptainsAdminWidgetComponent,
  ],
  templateUrl: './captains-page.component.html',
  styleUrls: ['./captains-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlayersService, PlayersStore],
})
export class CaptainsPageComponent {
  // @temporary
  // TODO JWT
  user: { isAdmin: boolean } = { isAdmin: true };
}
