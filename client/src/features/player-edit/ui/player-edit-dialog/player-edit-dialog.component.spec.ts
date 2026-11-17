import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import { PlayerEditDialogComponent } from './player-edit-dialog.component';

const player = {
  id: 'p1',
  nickname: 'Bomber',
  number: 9,
  user: { id: 'u1', email: 'gerd@sfl.test', name: 'Gerd', surname: 'M' },
};

function setup(data = player) {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(PlayerEditDialogComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = (label: string) =>
    [...el.querySelectorAll('mat-form-field')]
      .find(f => f.querySelector('mat-label')?.textContent?.trim() === label)!
      .querySelector('input') as HTMLInputElement;
  const type = async (label: string, value: string) => {
    const i = input(label);
    i.value = value;
    i.dispatchEvent(new Event('input'));
    i.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const ok = async () => {
    (
      el.querySelector('mat-dialog-actions [color=primary]') as HTMLElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, close, input, type, ok };
}

describe('PlayerEditDialogComponent (signal forms pilot)', () => {
  it('shows the player in the fields', () => {
    const { input } = setup();
    expect(input('Nickname').value).toBe('Bomber');
    expect(input('Number').value).toBe('9');
    expect(input('Email').value).toBe('gerd@sfl.test');
  });

  it('closes with the changed values on a valid form', async () => {
    const { type, ok, close } = setup();
    await type('Nickname', ' Striker ');
    await type('Number', '11');
    await ok();

    expect(close).toHaveBeenCalledWith({
      nickname: 'Striker',
      number: 11,
      user: { email: 'gerd@sfl.test', name: 'Gerd', surname: 'M' },
    });
  });

  it('an empty nickname shows the message and does not close', async () => {
    const { type, ok, close, el } = setup();
    await type('Nickname', '');
    await ok();

    expect(close).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Nickname is required');
  });

  it('a bad email and a number out of range show their messages', async () => {
    const { type, ok, close, el } = setup();
    await type('Email', 'nope');
    await type('Number', '1000');
    await ok();

    expect(close).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Enter a valid email');
    expect(el.textContent).toContain('Number is from 1 to 999');
  });

  it('Mat form field marks an invalid field after it was touched', async () => {
    const { type, el } = setup();
    await type('Nickname', '');

    const field = el.querySelector('mat-form-field')!;
    expect(field.classList.contains('mat-form-field-invalid')).toBe(true);
  });
});
