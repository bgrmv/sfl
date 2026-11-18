import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { InvitationPreview } from '@sfl/schemas';
import { KIT } from '@shared/ui/kit';
import { InvitationService } from '../api/invitation.service';

type State = 'loading' | 'ready' | 'unavailable' | 'connected';

/**
 * The page of a one-day link (S8.13, ADR 0021): the card of the player and the
 * button to Google. The same page answers `/connect/failed` (the return from a
 * refused sign-in) and `/connected`. An unknown, spent, expired and revoked
 * link look the same: the page does not tell which links exist.
 */
@Component({
  selector: 'sfl-connect-invitation-page',
  imports: [RouterLink, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      style="max-width:520px"
    >
      @switch (state()) {
        @case ('loading') {
          <p
            class="k-muted"
            role="status"
          >
            Checking the link…
          </p>
        }
        @case ('ready') {
          <sfl-card title="Link your account">
            <p>
              <span class="k-eyebrow">This is your player</span>
              <strong class="player">{{ nickname() }}</strong>
              <span class="k-muted">{{ fullName() }}</span>
            </p>
            <a
              sflBtn
              [href]="startUrl()"
            >
              Continue with Google
            </a>
            <p class="k-hint">
              The link works for one day and only once. Only your name and an
              identifier of your Google account are kept. Not you? Do not sign
              in and tell the admin.
            </p>
          </sfl-card>
        }
        @case ('connected') {
          <sfl-card title="You are connected">
            <p>Your Google account is linked to your player.</p>
            <div class="k-row">
              <a
                sflBtn
                routerLink="/profile"
              >
                Open my profile
              </a>
              <a
                sflBtn
                variant="ghost"
                routerLink="/players"
              >
                Players
              </a>
            </div>
          </sfl-card>
        }
        @default {
          <sfl-card title="This link does not work">
            <p>
              Links work for one day and only once. Ask the admin for a new one.
              Nothing was connected.
            </p>
            <a
              sflBtn
              routerLink="/home"
            >
              Go to the site
            </a>
          </sfl-card>
        }
      }
    </div>
  `,
  styles: `
    .player {
      display: block;
      font-size: var(--sfl-fs-h2-compact);
    }
  `,
})
export class ConnectInvitationPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly invitations = inject(InvitationService);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  private readonly result = this.route.snapshot.data['result'] as
    'failed' | 'connected' | undefined;

  protected readonly state = signal<State>(
    this.result === 'connected'
      ? 'connected'
      : this.result === 'failed' || !this.token
        ? 'unavailable'
        : 'loading',
  );
  private readonly preview = signal<InvitationPreview | null>(null);

  protected readonly nickname = computed(
    () => this.preview()?.player.nickname ?? '',
  );
  protected readonly fullName = computed(() => {
    const player = this.preview()?.player;
    return [player?.name, player?.surname].filter(Boolean).join(' ');
  });
  protected readonly startUrl = computed(() =>
    this.invitations.googleStartUrl(this.token),
  );

  constructor() {
    if (this.state() !== 'loading') return;
    this.invitations.preview(this.token).subscribe({
      next: preview => {
        this.preview.set(preview);
        this.state.set('ready');
      },
      error: () => this.state.set('unavailable'),
    });
  }
}
