import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IPlayerDTO } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';
import { cyrillicToLatin } from '@shared/utils/string';
import { catchError, delay, map, of, switchMap, tap } from 'rxjs';

const emailDomen = '@sfl.lv';

const isEmailValid = (email: string): boolean => {
  return /^[a-zA-Z0-9._%+-]+@sfl\.lv$/.test(email);
};

export function emailEndsWithSflComValidator(): ValidatorFn {
  return (control: AbstractControl): null | ValidationErrors => {
    // If the control value is empty, return null (valid)
    if (!control.value) {
      return null;
    }

    if (control.value.endsWith(emailDomen)) {
      return null;
    }

    // Check if the value ends with @sfl.com
    const isValid = control.value.endsWith(emailDomen)
      ? isEmailValid(control.value)
      : isEmailValid(control.value + emailDomen);

    // Return an error object if invalid, otherwise null
    return isValid ? null : { emailEndsWithSflCom: { value: control.value } };
  };
}

@Component({
    selector: 'sfl-create-player-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
        MatProgressBarModule,
    ],
    templateUrl: './create-player-dialog.component.html',
    styleUrl: './create-player-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PlayersService]
})
export class CreatePlayerDialogComponent implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly playersService = inject(PlayersService);
  private readonly dialogRef: MatDialogRef<CreatePlayerDialogComponent> =
    inject(MatDialogRef);

  protected readonly loadingSignal = signal(false);

  formGroup = new FormGroup<
    FormControls<Pick<IPlayerDTO, 'nickname' | 'number'>> & {
      user: FormGroup<
        FormControls<SetRequired<Partial<IPlayerDTO['user']>, 'id' | 'email'>>
      >;
    }
  >({
    nickname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    number: new FormControl(999, {
      nonNullable: true,
      validators: [
        Validators.min(1),
        Validators.max(999),
        Validators.pattern(/^[0-9]*$/),
      ],
    }),
    // TODO: problem with type
    user: new FormGroup<any>({
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, emailEndsWithSflComValidator()],
      }),
      name: new FormControl('', {
        nonNullable: true,
      }),
      surname: new FormControl('', {
        nonNullable: true,
      }),
    }),
  });

  ngOnInit() {
    this.formGroup.controls.nickname.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(nickname => {
        this.formGroup.controls.user.controls.email.patchValue(
          cyrillicToLatin(nickname),
        );
        this.formGroup.controls.user.controls.name!.patchValue(
          cyrillicToLatin(nickname),
        );
      });
  }

  ngAfterViewInit() {
    this.formGroup.markAllAsTouched();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit() {
    // TODO - exclude type casting
    const player = this.formGroup.getRawValue() as IPlayerDTO;
    player.user.email = player.user.email.endsWith(emailDomen)
      ? player.user.email
      : player.user.email + emailDomen;

    of(player)
      .pipe(
        tap(() => {
          this.loadingSignal.update(() => true);
        }),
        delay(1_000),
        switchMap(() => {
          return this.playersService
            .create(player)
            .pipe(map(players => players.at(0)!));
        }),
        catchError(error => {
          console.error(error);
          return of();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((player: IPlayerDTO) => {
        this.dialogRef.close(player);
      });
  }
}
