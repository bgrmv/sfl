import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { DatePipe, UpperCasePipe, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import {
  GameService,
  GameTeamCreateComponent,
  NewGameStore,
} from '@entities/games';
import { GameDeleteDialogComponent } from '@entities/games/components/game-delete-dialog/game-delete-dialog.component';
import { EnumGameMode, EnumGameStatus } from '@entities/games/constants';
import { TTeamFinal } from '@entities/games/types';
import { PlayersService } from '@entities/players/services/players.service';
import { TeamsService } from '@entities/teams';
import { getTotalWeeksBySeason } from '@entities/utils/date';
import { AuthService } from '@shared/services/auth.service';
import { getYear } from 'date-fns';
import { range } from 'lodash-es';
import { distinctUntilChanged, filter, map } from 'rxjs';

@Component({
  selector: 'sfl-game-creation-widget',
  imports: [
    // Material
    MatButtonModule,
    // MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    // TODO i dont need selection and options
    MatSelectModule,
    MatIconModule,
    MatOptionModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    MatListModule,
    MatExpansionModule,
    // CDK
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    // Custom
    GameTeamCreateComponent,
    DatePipe,
    KeyValuePipe,
    UpperCasePipe,
  ],
  templateUrl: './game-creation-widget.component.html',
  styleUrl: './game-creation-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NewGameStore, GameService, PlayersService, MatDialog],
})
export class GameCreationWidgetComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly newGameStore = inject(NewGameStore);
  private readonly gameService = inject(GameService);
  private readonly teamsService = inject(TeamsService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);

  protected readonly isAdminSignal = this.authService.isAdmin;
  readonly enumGameStatus = EnumGameStatus;

  protected readonly numbers = signal<number[]>(range(1, 54));
  protected readonly seasons = signal<number[]>(
    range(2010, getYear(new Date()) + 1),
  );
  protected readonly totalWeeks = signal<number>(52);
  protected readonly saturdayDate = signal<Date>(new Date());
  public readonly teams = this.newGameStore.teamsEntities;

  public readonly state = this.newGameStore;
  protected readonly gameId = this.newGameStore.gameId;
  protected readonly errors = this.newGameStore.errors;
  protected readonly playedAt = this.newGameStore.game.playedAt;
  protected readonly swapEnabled = this.newGameStore.swapEnabled;

  formGroup = new FormGroup({
    number: new FormControl<number>(
      { value: 0, disabled: true },
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(1),
          Validators.min(53),
        ],
      },
    ),
    season: new FormControl<number>(
      { value: 0, disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required, Validators.min(2010)],
      },
    ),

    status: new FormControl<EnumGameStatus>(
      { value: EnumGameStatus.New, disabled: true },
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),

    link: new FormControl<string>('', {
      nonNullable: true,
    }),

    description: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  // Store signals
  public readonly modeSignal = this.newGameStore.mode;
  readonly isFormChangedSignal = this.newGameStore.isFormChanged;
  readonly storeLoaded = this.newGameStore.storeLoaded;

  ngOnInit() {
    toObservable(this.newGameStore.storeLoaded, { injector: this.injector })
      .pipe(
        distinctUntilChanged(),
        filter(Boolean),
        map(() => this.newGameStore.mode()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(mode => {
        if (mode === EnumGameMode.Unknown) {
          this.router.navigate(['games']);
        }

        if (mode === EnumGameMode.Init) {
          return;
        }

        this.fillControls();
      });

    this.formGroup.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        this.newGameStore.updateStatus(status);
      });

    this.formGroup.controls.link.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(link => {
        this.newGameStore.updateGameFields({ link });
      });

    this.formGroup.controls.description.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(description => {
        this.newGameStore.updateGameFields({ description });
      });
  }

  save() {
    this.newGameStore.saveGame();
  }

  // TODO REPLACE
  update() {
    this.newGameStore.updateGame();
  }

  delete() {
    this.dialog
      .open(GameDeleteDialogComponent, {
        data: { game: this.newGameStore.game() },
      })
      .afterClosed()
      .subscribe(confirmed => {
        confirmed && this.router.navigate(['games']);
      });
  }

  swapStatistics() {
    this.newGameStore.swapStatistics();
  }

  drop(event: CdkDragDrop<[TTeamFinal, TTeamFinal]>) {
    const array = this.newGameStore.teamsEntities();

    if (!array) {
      return;
    }

    moveItemInArray(array, event.previousIndex, event.currentIndex);

    this.newGameStore.updateTeams(array as [TTeamFinal, TTeamFinal]);
  }

  private fillControls() {
    const { number, season, status, link, description } =
      this.newGameStore.game();

    if (number) {
      this.formGroup.controls.number.setValue(Number(number));
    }

    if (season) {
      this.formGroup.controls.season.setValue(Number(season));
      this.totalWeeks.set(getTotalWeeksBySeason(Number(season)));
    }

    if (status) {
      this.formGroup.controls.status.setValue(status);
      this.formGroup.controls.status.enable();
    }

    if (link) {
      this.formGroup.controls.link.setValue(link);
    }

    if (description) {
      this.formGroup.controls.description.setValue(description);
    }
  }
}
