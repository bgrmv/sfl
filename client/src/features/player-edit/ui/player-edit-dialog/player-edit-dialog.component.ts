import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IPlayerDTO } from '@entities/player';
import { playerEditFormSchema, type PlayerEditForm } from '@sfl/schemas';

/**
 * Signal forms pilot (S3.16, ADR 0007): the model is a signal, the rules come from
 * `playerEditFormSchema` in @sfl/schemas through `validateStandardSchema`.
 */
@Component({
  selector: 'sfl-player-edit-dialog',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    FormField,
  ],
  templateUrl: './player-edit-dialog.component.html',
  styleUrl: './player-edit-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEditDialogComponent {
  private readonly dialogRef: MatDialogRef<PlayerEditDialogComponent> =
    inject(MatDialogRef);

  protected readonly data: IPlayerDTO = inject(MAT_DIALOG_DATA);

  private readonly model = signal<PlayerEditForm>({
    nickname: this.data.nickname ?? '',
    number: this.data.number ?? 999,
    user: {
      email: this.data.user.email ?? '',
      name: this.data.user.name ?? '',
      surname: this.data.user.surname ?? '',
    },
  });

  protected readonly f = form(this.model, path => {
    validateStandardSchema(path, playerEditFormSchema);
  });

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit() {
    // Touches every field so the errors show, then closes only a valid form;
    // the request goes through PlayersStore.updateOne
    return submit(this.f, async () => {
      this.dialogRef.close(playerEditFormSchema.parse(this.model()));
    });
  }
}
