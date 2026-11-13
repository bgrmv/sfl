import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  Input,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { TCaptain } from '../../types';
import { CaptainCardComponent } from '../card/captain-card.component';

import { CardVariantEnum } from '@shared/constants/card';
import { CaptainStatsCardComponent } from '../card/captain-stats-card.component';

@Component({
  selector: 'sfl-captains-cards',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [MatCardModule, CaptainCardComponent, CaptainStatsCardComponent],
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
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <!-- Captains-cards  [class]="variant" -->
    @switch (variant) {
      @case (cardVariantEnum.Stats) {
        <section class="captains-cards">
          @for (captain of captains(); track captain; let oddd = $odd) {
            <sfl-captain-stats-card
              appCaptainToChoose
              [captain]="captain"
              [variant]="variant"
              [class.odd]="oddd"
              [attr.data-captain-id]="captain.id"
            />
          }
        </section>
      }
      @case (cardVariantEnum.Preview) {
        <section class="captains-cards">
          @for (captain of captains(); track captain; let oddd = $odd) {
            <sfl-captain-card
              appCaptainToChoose
              [captain]="captain"
              [variant]="variant"
              [attr.data-captain-id]="captain.id"
              [class.odd]="oddd"
            />
          }
        </section>
      }
      @default {
        #Default cards
      }
    }
  `,
})
export class CaptainsCardsComponent {
  readonly captains = input.required<TCaptain[]>();
  @Input() variant?: CardVariantEnum;
  readonly cardVariantEnum = CardVariantEnum;
}
