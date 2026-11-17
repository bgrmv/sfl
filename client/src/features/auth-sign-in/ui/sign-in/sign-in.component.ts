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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import type { ApiError } from '@sfl/schemas';
import { apiErrorMessage } from '@shared/api/api-error-message';
import { toResult } from '@shared/api/to-result';
import { AuthService } from '@shared/auth/auth.service';
import { safeReturnUrl } from '@shared/auth/return-url';
import { finalize } from 'rxjs';
import { environment } from '@environment/environment';
import { ButtonDirective } from '@shared/ui/kit';

@Component({
  selector: 'sfl-sign-in',
  imports: [RouterModule, ReactiveFormsModule, ButtonDirective],
  templateUrl: './sign-in.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./sign-in.component.css'],
})
export class SignInComponent {
  private router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly authService = inject(AuthService);

  loading = signal(false);

  /** The reason why the sign-in failed, under the form; null when there is none. */
  errorMessage = signal<string | null>(null);

  signInFG = new FormGroup({
    email: new FormControl<string>(environment.localCredentials?.email ?? '', {
      nonNullable: true,
      validators: [Validators.email, Validators.required],
    }),
    password: new FormControl<string>(
      environment.localCredentials?.password ?? '',
      {
        nonNullable: true,
        validators: [Validators.minLength(5), Validators.required],
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
    this.errorMessage.set(null);

    this.authService
      .signIn(this.signInFG.getRawValue())
      .pipe(
        toResult(),
        // The bar stops on a success and on an error alike
        finalize(() => this.loading.set(false)),
      )
      .subscribe(result =>
        result.match({
          ok: response => {
            if (response) {
              // Back to the page the guard or a 401 took the person from
              this.router.navigateByUrl(
                safeReturnUrl(
                  this.route.snapshot.queryParamMap.get('returnUrl'),
                ),
              );
            }
          },
          err: error => this.errorMessage.set(signInErrorMessage(error)),
        }),
      );
  }
}

/** What the person at the form needs to read; the details stay in the console. */
function signInErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'UNAUTHORIZED':
      return 'Wrong email or password.';
    case 'TOO_MANY_REQUESTS':
      return 'Too many attempts. Try again in a minute.';
    default:
      return apiErrorMessage(error);
  }
}
