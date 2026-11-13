import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'sfl-aside',
    imports: [
        CommonModule,
        RouterModule,
        MatIconModule,
        MatListModule,
        MatExpansionModule,
    ],
    templateUrl: './aside.component.html',
    styleUrls: ['./aside.component.css'],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
