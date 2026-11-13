import { UpperCasePipe } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'sfl-aside',
  imports: [
    RouterModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    UpperCasePipe,
  ],
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AsideComponent {
  links = [
    {
      name: 'Home',
      href: '/home',
      icon: 'home',
    },
    // {
    //   name: 'Captains',
    //   href: '/captains',
    //   icon: 'person',
    // },
    {
      name: 'Players',
      href: '/players',
      icon: 'groups',
    },
    {
      name: 'Games',
      href: '/games',
      icon: 'scoreboard',
    },
  ];
}
