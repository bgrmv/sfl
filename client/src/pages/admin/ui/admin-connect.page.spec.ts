import { TestBed } from '@angular/core/testing';
import { PlayersService } from '@entities/player';
import type { InvitationList } from '@sfl/schemas';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { InvitationsService } from '../api/invitations.service';
import { AdminConnectPageComponent } from './admin-connect.page';

const players = [
  { id: 'p1', nickname: 'Lynx', user: { name: 'Ivan', surname: 'Petrov' } },
  { id: 'p2', nickname: 'Hawk', user: { name: 'Oleg', surname: 'Sidorov' } },
  { id: 'p3', nickname: 'Viper', user: { name: 'Anna', surname: 'Ivanova' } },
];

const list = (over: Partial<InvitationList> = {}): InvitationList => ({
  items: [
    {
      id: 'i1',
      player: { id: 'p2', nickname: 'Hawk', name: 'Oleg', surname: 'Sidorov' },
      status: 'active',
      createdAt: '2026-11-18T10:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
    {
      id: 'i2',
      player: { id: 'p3', nickname: 'Viper', name: 'Anna', surname: 'Ivanova' },
      status: 'used',
      createdAt: '2026-11-17T10:00:00.000Z',
      expiresAt: '2026-11-18T10:00:00.000Z',
      usedAt: '2026-11-17T11:00:00.000Z',
    },
  ],
  linkedPlayerIds: ['p3'],
  ...over,
});

function setup(invitations: Partial<Record<string, unknown>> = {}) {
  const service = {
    list: vi.fn(() => of(list())),
    create: vi.fn(() =>
      of({
        id: 'i9',
        token: 'tok',
        url: 'https://sfl.test/connect/tok',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    ),
    revoke: vi.fn(() => of(null)),
    ...invitations,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(AdminConnectPageComponent, {
    set: {
      providers: [
        { provide: InvitationsService, useValue: service },
        { provide: PlayersService, useValue: { find: () => of(players) } },
      ],
    },
  });
  const fixture = TestBed.createComponent(AdminConnectPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const options = () =>
    [...el.querySelectorAll('[role=option]')].map(o => o.textContent?.trim());
  const type = (text: string) => {
    const input = el.querySelector('input[type=search]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const choose = (label: string) => {
    const option = [
      ...el.querySelectorAll<HTMLButtonElement>('[role=option] button'),
    ].find(b => b.textContent?.trim() === label)!;
    option.click();
    fixture.detectChanges();
  };
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find(
      b => b.textContent?.trim() === text,
    );
  return { el, service, options, type, choose, button, fixture };
}

describe('AdminConnectPageComponent', () => {
  it('offers only the players without a Google account, as "Nick, Name Surname"', () => {
    const { options } = setup();

    expect(options()).toEqual(['Hawk, Oleg Sidorov', 'Lynx, Ivan Petrov']);
  });

  it('narrows the list as you type, by nickname, name or surname', () => {
    const { options, type, el } = setup();

    type('sid');
    expect(options()).toEqual(['Hawk, Oleg Sidorov']);
    type('ivan petr');
    expect(options()).toEqual(['Lynx, Ivan Petrov']);
    type('nobody');
    expect(options()).toEqual([]);
    expect(el.textContent).toContain('No player matches.');
  });

  it('makes a link for the chosen player and shows it', () => {
    const { service, choose, button, fixture, el } = setup();

    expect(button('Generate link')?.disabled).toBe(true);
    choose('Lynx, Ivan Petrov');
    button('Generate link')!.click();
    fixture.detectChanges();

    expect(service.create).toHaveBeenCalledWith('p1');
    expect(el.textContent).toContain('https://sfl.test/connect/tok');
    expect(button('Copy link')).toBeTruthy();
  });

  it('lists the links with their status and revokes an active one', () => {
    const { service, el, button, fixture } = setup();

    expect(el.textContent).toContain('Hawk');
    expect(el.textContent).toContain('Active');
    expect(el.textContent).toContain('Used');

    button('Revoke')!.click();
    fixture.detectChanges();

    expect(service.revoke).toHaveBeenCalledWith('i1');
  });

  it('filters the list by status', () => {
    const { el, fixture } = setup();

    const used = [...el.querySelectorAll('sfl-segmented button')].find(
      b => b.textContent?.trim() === 'Used',
    ) as HTMLButtonElement;
    used.click();
    fixture.detectChanges();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Viper');
  });
});
