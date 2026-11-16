import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { CaptainsService } from '@entities/captain';
import { PlayersStore } from '@entities/player';
import { PlayerCreateButtonComponent } from '@features/player-create';
import { PlayersTableComponent } from './players-table/players-table.component';
import { PlayersService } from '@entities/player';
import { AuthService } from '@shared/auth/auth.service';
import { PageComponent } from '@shared/ui/core/page/page.component';

@Component({
  imports: [
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatDividerModule,
    PlayersTableComponent,
    PlayerCreateButtonComponent,
    PageComponent,
  ],
  styles: `
    :host {
      .tab-container {
        margin: 12px 24px;

        > .tab-header {
          display: flex;
          justify-content: flex-end;
        }

        > .tab-content {
          margin: 12px 0;
        }
      }
    }
  `,
  template: `
    <sfl-page title="players">
      <div class="tab-container">
        <div class="tab-header">
          @if (isAdminSignal()) {
            <sfl-player-create-button />
          }
        </div>

        <div class="tab-content">
          <sfl-players-table />
        </div>
      </div>
    </sfl-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Fixme: CaptainsStore uses CaptainsService, idk how to fix this
    // https://angular.io/api/core/FactoryProvider
    CaptainsService,
    PlayersService,
    // Move to the widget
    // // To use CaptainsService - useEffects
    PlayersStore,
    AuthService,
  ],
})
export class PlayersMainPageComponent {
  private readonly authService = inject(AuthService);

  protected readonly isAdminSignal = this.authService.isAdmin;
}
