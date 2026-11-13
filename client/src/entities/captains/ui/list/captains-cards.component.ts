import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { TCaptain } from '../../types';
import { CaptainCardComponent } from '../card/captain-card.component';
import { CaptainToChooseDirective } from '../../directives/captain-to-choose.directive';
import { CardVariantEnum } from '@shared/constants/card';
import { CaptainStatsCardComponent } from '../card/captain-stats-card.component';

@Component({
    selector: 'sfl-captains-cards',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [
        CommonModule,
        MatCardModule,
        CaptainToChooseDirective,
        CaptainCardComponent,
        CaptainStatsCardComponent,
    ],
    // styleUrls: ['./captain-card.component.scss'],
    styles: [
        `
      /* :host {
        width: 100%;
        display: block;
        position: relative;
      } */

      section.captains-cards {
        display: grid;
        gap: 20px 10px;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        /* & sfl-captain-card {
          padding: 10px;
          max-width: 90%;
        } */

        &.full {
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          & sfl-captain-card {
            padding: 10px;
            max-width: 90%;
          }
        }
      }
    `,
    ],
    // templateUrl: './captain-card.component.html',
    template: `
    <!-- Captains-cards  [class]="variant" -->
    <ng-container [ngSwitch]="variant">
      <ng-container *ngSwitchCase="cardVariantEnum.Stats"
        ><section class="captains-cards">
          <sfl-captain-stats-card
            appCaptainToChoose
            *ngFor="let captain of captains; odd as oddd"
            [captain]="captain"
            [variant]="variant"
            [class.odd]="oddd"
            [attr.data-captain-id]="captain.id"
          ></sfl-captain-stats-card></section
      ></ng-container>

      <ng-container *ngSwitchCase="cardVariantEnum.Preview"
        ><section class="captains-cards">
          <sfl-captain-card
            appCaptainToChoose
            [captain]="captain"
            [variant]="variant"
            [attr.data-captain-id]="captain.id"
            *ngFor="let captain of captains; odd as oddd"
            [class.odd]="oddd"
          ></sfl-captain-card></section
      ></ng-container>

      <ng-container *ngSwitchDefault>#Default cards</ng-container>
    </ng-container>
  `
})
export class CaptainsCardsComponent {
  @Input({ required: true }) captains!: TCaptain[];
  @Input() variant?: CardVariantEnum;
  readonly cardVariantEnum = CardVariantEnum;
}
