import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { InvitationService } from '../api/invitation.service';
import { ConnectInvitationPageComponent } from './connect-invitation.page';

const preview = {
  player: { nickname: 'Lynx', name: 'Ivan', surname: 'Petrov' },
  expiresAt: '2026-11-19T10:00:00.000Z',
};

function setup(
  params: Record<string, string>,
  data: Record<string, unknown>,
  previewFn = vi.fn(() => of(preview)),
) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: new Map(Object.entries(params)), data },
        },
      },
      {
        provide: InvitationService,
        useValue: {
          preview: previewFn,
          googleStartUrl: (t: string) =>
            `/rest/auth/google/start?invitation=${t}`,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ConnectInvitationPageComponent);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, previewFn };
}

describe('ConnectInvitationPageComponent', () => {
  it('shows the player of the link and a button to Google', () => {
    const { el } = setup({ token: 'abc' }, {});

    expect(el.textContent).toContain('Lynx');
    expect(el.textContent).toContain('Ivan Petrov');
    const button = el.querySelector('a[href]') as HTMLAnchorElement;
    expect(button.textContent).toContain('Continue with Google');
    expect(button.getAttribute('href')).toBe(
      '/rest/auth/google/start?invitation=abc',
    );
  });

  it('shows one message for a link that does not work and for a refused sign-in', () => {
    const dead = setup(
      { token: 'gone' },
      {},
      vi.fn(() => throwError(() => new Error('404'))),
    ).el.textContent;
    const failed = setup({}, { result: 'failed' }).el.textContent;

    expect(dead).toContain('This link does not work');
    expect(failed).toBe(dead);
  });

  it('does not ask the server after a failed return', () => {
    const { previewFn } = setup({}, { result: 'failed' });

    expect(previewFn).not.toHaveBeenCalled();
  });

  it('says that the account is connected', () => {
    const { el } = setup({}, { result: 'connected' });

    expect(el.textContent).toContain('You are connected');
  });
});
