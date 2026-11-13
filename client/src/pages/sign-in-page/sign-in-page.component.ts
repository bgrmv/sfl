import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignInComponent } from '@features';

@Component({
    selector: 'sfl-sign-in-page',
    imports: [CommonModule, SignInComponent],
    template: `<sfl-sign-in></sfl-sign-in>`,
    styleUrls: ['./sign-in-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInPageComponent {}
