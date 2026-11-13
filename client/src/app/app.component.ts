import { Component, inject } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AsideComponent } from 'src/shared/ui/core/aside';

import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CookieService } from '@shared/services/cookie.service';
import { HttpService } from '@shared/services/http.service';
import { JwtService } from '@shared/services/jwt.service';
import { LocalStorageService } from '@shared/services/local-storage.service';
import packageJSON from 'package.json';
import { AuthService } from '../shared/services/auth.service';
import { NavigationComponent } from '../shared/ui/core/navigation/navigation.component';

@Component({
  selector: 'sfl-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    RouterOutlet,
    AsideComponent,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatSidenavModule,
    RouterModule,
    NavigationComponent,
  ],
  providers: [
    HttpService,
    CookieService,
    JwtService,
    LocalStorageService,
    RouterModule,
  ],
})
export class AppComponent {
  #cookieService = inject(CookieService);
  #jwtService = inject(JwtService);
  #httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly authService = inject(AuthService);
  readonly userSignal = this.authService.user;

  protected readonly version = packageJSON.version;

  onSignOut() {
    this.authService.signOut().subscribe(response => {
      if (response) {
        this.router.navigate(['/']);
      }
    });
  }
}
