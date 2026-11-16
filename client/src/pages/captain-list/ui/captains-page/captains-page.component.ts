import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { CaptainsService, CaptainsStore } from '@entities/captain';
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
  providers: [
    // Fixme: CaptainsStore uses CaptainsService, idk how to fix this
    // https://angular.io/api/core/FactoryProvider
    CaptainsService,

    CaptainsStore,
  ],
})
export class CaptainsPageComponent {
  // @temporary
  // TODO JWT
  user: { isAdmin: boolean } = { isAdmin: true };
}
