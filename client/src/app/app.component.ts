import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { CookieService } from '@shared/lib/cookie.service';
import { HttpService } from '@shared/api/http.service';
import { JwtService } from '@shared/auth/jwt.service';
import { LocalStorageService } from '@shared/lib/local-storage.service';
import packageJSON from 'package.json';
import { AuthService } from '@shared/auth/auth.service';
import {
  RATING_SYSTEMS,
  RatingSystemStore,
} from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

interface NavLink {
  readonly name: string;
  readonly href: string;
  readonly badge?: boolean;
}

@Component({
  selector: 'sfl-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HttpService, CookieService, JwtService, LocalStorageService],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly userSignal = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;
  readonly menuOpen = signal(false);
  protected readonly rating = inject(RatingSystemStore);
  protected readonly ratingSystems = RATING_SYSTEMS;
  protected readonly socials = ['Instagram', 'Telegram', 'YouTube', 'Facebook'];
  /** The admin area has its own sidebar shell (board Dashboard): no public header and footer. */
  protected readonly adminArea = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: this.router.url.startsWith('/admin') },
  );

  protected readonly version = packageJSON.version;
  protected readonly year = new Date().getFullYear();

  protected readonly links: readonly NavLink[] = [
    { name: 'Home', href: '/home' },
    { name: 'Games', href: '/games' },
    { name: 'Players', href: '/players' },
    { name: 'Captains', href: '/captains' },
    { name: 'Compare', href: '/compare' },
    { name: 'Release notes', href: '/releases', badge: true },
    { name: 'Seasons', href: '/seasons' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'Rules', href: '/rules' },
    { name: 'Vote', href: '/vote' },
    { name: 'Photo and video', href: '/media' },
  ];

  protected readonly footerLeague = [
    ['Games', '/games'],
    ['Players', '/players'],
    ['Captains', '/captains'],
    ['Seasons', '/seasons'],
    ['History', '/history'],
    ['Photo and video', '/media'],
  ] as const;
  protected readonly footerRules = [
    ['Codex', '/rules'],
    ['Vote', '/vote'],
    ['How points work', '/scoring'],
    ['Suggest or complain anonymously', '/suggest'],
  ] as const;

  onSignOut() {
    this.authService.signOut().subscribe(response => {
      if (response) {
        this.router.navigate(['/']);
      }
    });
  }
}
