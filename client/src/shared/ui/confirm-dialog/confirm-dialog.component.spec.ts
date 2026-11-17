import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  function setup() {
    const close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Anonymize Falcon?',
            text: 'The name is erased, the games stay.',
            confirmLabel: 'Anonymize',
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, close };
  }

  it('shows the question and names the action on the button', () => {
    const { el } = setup();
    const buttons = [...el.querySelectorAll('button')].map(b =>
      b.textContent?.trim(),
    );

    expect(el.textContent).toContain('Anonymize Falcon?');
    expect(el.textContent).toContain('the games stay');
    expect(buttons).toEqual(['Cancel', 'Anonymize']);
  });

  it('closes with true on the action and with false on Cancel', () => {
    const { el, close } = setup();
    const [cancel, confirm] = [
      ...el.querySelectorAll('button'),
    ] as HTMLButtonElement[];

    cancel.click();
    confirm.click();

    expect(close.mock.calls.map(call => call[0])).toEqual([false, true]);
  });
});
