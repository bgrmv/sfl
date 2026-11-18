import { TestBed } from '@angular/core/testing';
import type { AdminUser } from '@sfl/schemas';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { UsersAdminService } from '../api/users-admin.service';
import { AdminUsersPageComponent } from './admin-users.page';

const row = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1',
  name: 'Ivan',
  surname: 'Petrov',
  nickname: 'Lynx',
  roles: ['USER'],
  hasGoogle: false,
  ...over,
});

function setup(list: AdminUser[], setRoles = vi.fn()) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(AdminUsersPageComponent, {
    set: {
      providers: [
        {
          provide: UsersAdminService,
          useValue: { list: vi.fn(() => of(list)), setRoles },
        },
      ],
    },
  });
  const fixture = TestBed.createComponent(AdminUsersPageComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const box = (index: number) =>
    el.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]')[index];
  const click = (input: HTMLInputElement, checked: boolean) => {
    input.checked = checked;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const save = () => {
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    fixture.detectChanges();
  };
  return { el, box, click, save };
}

describe('AdminUsersPageComponent', () => {
  it('shows the roles of a person and no Save button until something changes', () => {
    const { el, box } = setup([row({ roles: ['MODERATOR', 'USER'] })]);

    expect(el.textContent).toContain('Lynx');
    // columns: Admin, Moderator, User
    expect([0, 1, 2].map(i => box(i).checked)).toEqual([false, true, true]);
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('saves the chosen roles and shows what the server answered', () => {
    const setRoles = vi.fn(() => of(row({ roles: ['ADMIN', 'USER'] })));
    const { box, click, save, el } = setup([row()], setRoles);

    click(box(0), true);
    save();

    expect(setRoles).toHaveBeenCalledWith('u1', ['USER', 'ADMIN']);
    expect(box(0).checked).toBe(true);
    expect(el.querySelector('tbody button')).toBeNull();
  });

  it('says why the server refused', () => {
    const setRoles = vi.fn(() =>
      throwError(() => ({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'The league needs at least one admin',
      })),
    );
    const { box, click, save, el } = setup(
      [row({ roles: ['ADMIN'] })],
      setRoles,
    );

    click(box(0), false);
    save();

    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'at least one admin',
    );
  });

  it('can leave a person with no role: the level of a guest', () => {
    const setRoles = vi.fn(() => of(row({ roles: [] })));
    const { box, click, save } = setup([row()], setRoles);

    click(box(2), false);
    save();

    expect(setRoles).toHaveBeenCalledWith('u1', []);
  });
});
