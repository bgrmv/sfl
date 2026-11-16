import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('a failed sign-in', () => {
    const API = 'https://sfl.com:3001/rest';
    const submit = (status: number, body: object) => {
      const http = TestBed.inject(HttpTestingController);
      component.onSubmit();
      http
        .expectOne(`${API}/auth/sign-in`)
        .flush(body, { status, statusText: 'x' });
      fixture.detectChanges();
    };
    const alert = () =>
      fixture.nativeElement.querySelector(
        '[role="alert"]',
      ) as HTMLElement | null;

    it('tells that the email or the password is wrong, and stops the bar', () => {
      submit(401, {
        ok: false,
        error: { status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });

      expect(alert()?.textContent).toContain('Wrong email or password.');
      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector('mat-progress-bar'),
      ).toBeNull();
    });

    it('tells about too many attempts', () => {
      submit(429, {
        ok: false,
        error: { status: 429, code: 'TOO_MANY_REQUESTS', message: 'x' },
      });

      expect(alert()?.textContent).toContain('Too many attempts');
    });

    it('shows something for a server error too, not silence', () => {
      submit(500, {
        ok: false,
        error: { status: 500, code: 'INTERNAL_ERROR', message: 'x' },
      });

      expect(alert()?.textContent).toContain('Server error');
      expect(component.loading()).toBe(false);
    });

    it('shows something when the server does not answer', () => {
      const http = TestBed.inject(HttpTestingController);
      component.onSubmit();
      http.expectOne(`${API}/auth/sign-in`).error(new ProgressEvent('error'));
      fixture.detectChanges();

      expect(alert()?.textContent).toContain('No connection');
      expect(component.loading()).toBe(false);
    });

    it('clears the error at the next attempt', () => {
      submit(401, {
        ok: false,
        error: { status: 401, code: 'UNAUTHORIZED', message: 'x' },
      });
      component.onSubmit();
      fixture.detectChanges();

      expect(alert()).toBeNull();
      TestBed.inject(HttpTestingController).expectOne(`${API}/auth/sign-in`);
    });
  });
});
