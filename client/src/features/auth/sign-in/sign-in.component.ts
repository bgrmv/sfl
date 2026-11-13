import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'sfl-sign-in',
  imports: [
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressBarModule,
    RouterModule,
    ReactiveFormsModule,
  ],
  templateUrl: './sign-in.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./sign-in.component.css'],
})
export class SignInComponent {
  private router = inject(Router);

  private readonly authService = inject(AuthService);

  loading = signal(false);

  signInFG = new FormGroup({
    email: new FormControl<string>(environment.localCredentials?.email ?? '', {
      nonNullable: true,
      validators: [Validators.email, Validators.required],
    }),
    password: new FormControl<string>(
      environment.localCredentials?.password ?? '',
      {
        nonNullable: true,
        validators: [Validators.min(5), Validators.required],
      },
    ),
  });

  get emailFG() {
    return this.signInFG.controls.email;
  }

  get passwordFG() {
    return this.signInFG.controls.password;
  }

  onSubmit() {
    this.loading.set(true);
    const payload = this.signInFG.getRawValue();

    this.authService
      .signIn(payload)

      .subscribe(response => {
        if (response) {
          this.router.navigate(['/']);
        }
        this.loading.set(false);
      });
  }
}
