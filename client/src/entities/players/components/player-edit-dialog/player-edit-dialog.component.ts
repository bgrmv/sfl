import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IPlayerDTO } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';

@Component({
    selector: 'sfl-player-edit-dialog',
    imports: [
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ReactiveFormsModule,
    ],
    providers: [PlayersService],
    templateUrl: './player-edit-dialog.component.html',
    styleUrl: './player-edit-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerEditDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly playersService = inject(PlayersService);
  private readonly dialogRef: MatDialogRef<PlayerEditDialogComponent> =
    inject(MatDialogRef);

  protected readonly data: IPlayerDTO = inject(MAT_DIALOG_DATA);

  formGroup = new FormGroup<
    FormControls<Pick<IPlayerDTO, 'nickname' | 'number'>> & {
      user: FormGroup<
        FormControls<SetRequired<Partial<IPlayerDTO['user']>, 'id' | 'email'>>
      >;
    }
  >({
    nickname: new FormControl(this.data.nickname ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    number: new FormControl(this.data.number ?? 999, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(999)],
    }),
    // TODO: problem with type
    user: new FormGroup<any>({
      id: new FormControl(this.data.user.id, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      email: new FormControl(this.data.user.email, {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      name: new FormControl(this.data.user.name ?? '', {
        nonNullable: true,
      }),
      surname: new FormControl(this.data.user.surname ?? '', {
        nonNullable: true,
      }),
    }),
  });

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit() {
    this.playersService
      .patch(this.data.id, this.formGroup.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(patchedPlayer => {
        this.dialogRef.close(patchedPlayer);
      });
  }
}
