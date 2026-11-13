import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'sfl-page',
  imports: [MatDividerModule, UpperCasePipe],
  styles: `
    :host {
      position: relative;
      .page-container {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        gap: 16px;
      }
    }
  `,
  template: `
    <div>
      <h1>
        {{ title() | uppercase }}
      </h1>
      <mat-divider />
      <br />

      <div class="page-container">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  public readonly title = input.required<string>();
}
