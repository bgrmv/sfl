import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SignInComponent } from '@features';

@Component({
  selector: 'sfl-sign-in-page',
  imports: [SignInComponent],
  template: `
    <sfl-sign-in></sfl-sign-in>
  `,
  styleUrls: ['./sign-in-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPageComponent {}
