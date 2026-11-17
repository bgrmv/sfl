import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeatureKey } from '@shared/config/feature-flags';
import { FeatureService } from './feature';

/** `<button sflBtn variant="ghost" size="sm">` */
@Directive({
  selector: '[sflBtn]',
  host: {
    class: 'k-btn',
    '[class.k-btn--ghost]': 'variant() === "ghost"',
    '[class.k-btn--danger]': 'variant() === "danger"',
    '[class.k-btn--sm]': 'size() === "sm"',
  },
})
export class ButtonDirective {
  readonly variant = input<'primary' | 'ghost' | 'danger'>('primary');
  readonly size = input<'md' | 'sm'>('md');
}

/** Block container: heading, optional "see all" link and the dummy ribbon. */
@Component({
  selector: 'sfl-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .card {
      height: 100%;
      background: var(--sfl-surface);
      border: 1px solid var(--sfl-border);
      border-radius: var(--sfl-radius);
      padding: var(--sfl-pad-card);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card h2 {
      font-size: var(--sfl-fs-h2-compact);
    }
    .card.score {
      padding: 20px;
      gap: 14px;
      background: var(--sfl-score-bg);
      color: #f6f1e4;
      border-color: transparent;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 4px 12px;
    }
    .dummy {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px dashed var(--sfl-muted);
      color: var(--sfl-muted);
      border-radius: var(--sfl-radius-pill);
      padding: 0 8px;
    }
  `,
  template: `
    <section
      class="card"
      [class.score]="tone() === 'score'"
      [attr.aria-label]="title()"
      [attr.data-dummy]="dummy() ? flag() : null"
    >
      @if (title()) {
        <header>
          @if (sub()) {
            <h3>{{ title() }}</h3>
          } @else {
            <h2>{{ title() }}</h2>
          }
          <span class="k-row">
            @if (dummy() && showMarker()) {
              <span
                class="dummy"
                [title]="needs()"
              >
                dummy
              </span>
            }
            @if (link() && linkLabel()) {
              <a
                class="k-link"
                [routerLink]="link()"
              >
                {{ linkLabel() }}
              </a>
            }
          </span>
        </header>
      }
      <ng-content />
    </section>
  `,
})
export class CardComponent {
  private readonly features = inject(FeatureService);
  readonly title = input('');
  readonly link = input<string | null>(null);
  readonly linkLabel = input('');
  readonly tone = input<'default' | 'score'>('default');
  /** A card inside a section: the title is an h3 of the boards. */
  readonly sub = input(false);
  readonly flag = input<FeatureKey | null>(null);
  readonly dummy = computed(() => {
    const f = this.flag();
    return f ? this.features.isDummy(f) : false;
  });
  readonly needs = computed(() => {
    const f = this.flag();
    return f ? this.features.info(f).needs : '';
  });
  readonly showMarker = computed(() => this.features.showMarkers);
}

/** Page section of the boards: an h2 with an optional link, no frame. */
@Component({
  selector: 'sfl-section',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 4px 12px;
    }
    .dummy {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px dashed var(--sfl-muted);
      color: var(--sfl-muted);
      border-radius: var(--sfl-radius-pill);
      padding: 0 8px;
    }
  `,
  template: `
    <section
      [attr.aria-label]="title()"
      [attr.data-dummy]="dummy() ? flag() : null"
    >
      <header>
        <h2>{{ title() }}</h2>
        <span class="k-row">
          @if (dummy() && showMarker()) {
            <span
              class="dummy"
              [title]="needs()"
            >
              dummy
            </span>
          }
          @if (link() && linkLabel()) {
            <a
              class="k-link"
              [routerLink]="link()"
            >
              {{ linkLabel() }}
            </a>
          }
        </span>
      </header>
      <ng-content />
    </section>
  `,
})
export class SectionComponent {
  private readonly features = inject(FeatureService);
  readonly title = input.required<string>();
  readonly link = input<string | null>(null);
  readonly linkLabel = input('');
  readonly flag = input<FeatureKey | null>(null);
  readonly dummy = computed(() => {
    const f = this.flag();
    return f ? this.features.isDummy(f) : false;
  });
  readonly needs = computed(() => {
    const f = this.flag();
    return f ? this.features.info(f).needs : '';
  });
  readonly showMarker = computed(() => this.features.showMarkers);
}

@Component({
  selector: 'sfl-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: var(--sfl-radius-pill);
      border: 1px solid var(--sfl-border);
      white-space: nowrap;
    }
    :host(.accent) {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
      border-color: var(--sfl-accent);
    }
    :host(.outline) {
      border-color: var(--sfl-accent);
      color: var(--sfl-accent);
    }
    :host(.muted) {
      background: var(--sfl-chip);
    }
    :host(.neg) {
      border-color: var(--sfl-neg);
      color: var(--sfl-neg);
    }
  `,
  host: { '[class]': 'tone()' },
  template: `
    <ng-content />
  `,
})
export class BadgeComponent {
  readonly tone = input<'default' | 'accent' | 'outline' | 'muted' | 'neg'>(
    'default',
  );
}

/** Initials in a square; the photo comes later (S10.19). */
@Component({
  selector: 'sfl-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      border-radius: var(--sfl-radius);
      background: var(--sfl-surface-2);
      color: var(--sfl-muted);
      font-family: var(--sfl-font-head);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    :host(.accent) {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
  `,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.38',
    '[class.accent]': 'accent()',
    'aria-hidden': 'true',
  },
  template: `
    {{ text() }}
  `,
})
export class AvatarComponent {
  readonly text = input.required<string>();
  readonly size = input(40);
  readonly accent = input(false);
}

/** W/D/L form: letters, never colour alone. */
@Component({
  selector: 'sfl-form-dots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      gap: 3px;
    }
    span {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      border-radius: 2px;
      background: var(--sfl-chip);
    }
    .W {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
    }
    .L {
      background: transparent;
      border: 1px solid var(--sfl-neg);
      color: var(--sfl-neg);
    }
  `,
  template: `
    @for (c of letters(); track $index) {
      <span [class]="c">{{ c }}</span>
    }
  `,
  host: { role: 'img', '[attr.aria-label]': '"Form: " + form()' },
})
export class FormDotsComponent {
  readonly form = input.required<string>();
  readonly letters = computed(() => this.form().split(''));
}

/** Number card with an "i" tooltip (title attribute: keyboard and touch friendly via details). */
@Component({
  selector: 'sfl-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .stat {
      background: var(--sfl-surface-2);
      border-radius: var(--sfl-radius);
      padding: 12px 14px;
      height: 100%;
    }
    .label {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--sfl-muted);
    }
    .value {
      font-family: var(--sfl-font-head);
      font-weight: 700;
      font-size: 30px;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .value.accent {
      color: var(--sfl-accent);
    }
    .sub {
      font-size: 12px;
      color: var(--sfl-muted);
    }
    .i {
      cursor: help;
      border: 1px solid var(--sfl-muted);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-transform: none;
    }
  `,
  template: `
    <div class="stat">
      <div class="label">
        {{ label() }}
        @if (tip()) {
          <span
            class="i"
            tabindex="0"
            role="img"
            [title]="tip()"
            [attr.aria-label]="tip()"
          >
            i
          </span>
        }
      </div>
      <div
        class="value"
        [class.accent]="accent()"
      >
        {{ value() }}
      </div>
      @if (sub()) {
        <div class="sub">{{ sub() }}</div>
      }
    </div>
  `,
})
export class StatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly sub = input('');
  readonly tip = input('');
  readonly accent = input(false);
}

/** Segmented control (season, system, view). */
@Component({
  selector: 'sfl-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    button {
      min-height: 32px;
      padding: 0 12px;
      border-radius: var(--sfl-radius);
      border: 1px solid var(--sfl-border);
      background: transparent;
      color: var(--sfl-text);
      font: 600 13px var(--sfl-font-body);
      cursor: pointer;
    }
    button[aria-checked='true'] {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
      border-color: var(--sfl-accent);
    }
  `,
  host: { role: 'radiogroup', '[attr.aria-label]': 'label()' },
  template: `
    @for (o of options(); track o) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="o === value()"
        (click)="changed.emit(o)"
      >
        {{ o }}
      </button>
    }
  `,
})
export class SegmentedComponent {
  readonly options = input.required<readonly string[]>();
  readonly value = input.required<string>();
  readonly label = input('Options');
  readonly changed = output<string>();
}

@Component({
  selector: 'sfl-page-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px 24px;
    }
    .lead {
      color: var(--sfl-muted);
      max-width: 70ch;
      margin-top: 4px;
    }
  `,
  template: `
    <div>
      <h1>{{ title() }}</h1>
      @if (lead()) {
        <p class="lead">{{ lead() }}</p>
      }
    </div>
    <div class="k-row"><ng-content /></div>
  `,
})
export class PageHeadComponent {
  readonly title = input.required<string>();
  readonly lead = input('');
}

/** Loading, empty and error states of a block (board "States"). */
@Component({
  selector: 'sfl-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px dashed var(--sfl-border);
      border-radius: var(--sfl-radius);
      padding: 24px;
      text-align: center;
    }
    .sk {
      height: 14px;
      border-radius: 2px;
      background: var(--sfl-surface-2);
      margin: 8px auto;
      animation: sh 1.4s infinite;
    }
    @keyframes sh {
      0% {
        opacity: 0.55;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.55;
      }
    }
  `,
  template: `
    @if (kind() === 'loading') {
      <div
        role="status"
        aria-live="polite"
      >
        <div
          class="sk"
          style="width: 60%"
        ></div>
        <div
          class="sk"
          style="width: 40%"
        ></div>
        <span class="k-visually-hidden">{{ title() || 'Loading…' }}</span>
      </div>
    } @else {
      <h3>{{ title() }}</h3>
      <p class="k-muted">{{ text() }}</p>
      <div
        class="k-row"
        style="justify-content: center; margin-top: 12px"
      >
        <ng-content />
      </div>
    }
  `,
})
export class StateComponent {
  readonly kind = input<'loading' | 'empty' | 'error'>('empty');
  readonly title = input('');
  readonly text = input('');
}

/** BMW against HONDA style split bar. */
@Component({
  selector: 'sfl-split-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .bar {
      display: flex;
      height: 14px;
      border-radius: 2px;
      overflow: hidden;
      gap: 2px;
    }
    .a {
      background: var(--sfl-bmw);
    }
    .b {
      background: var(--sfl-honda);
    }
    .labels {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 4px;
    }
  `,
  template: `
    <div class="labels">
      <span>{{ aLabel() }} {{ a() }}</span>
      <span>{{ b() }} {{ bLabel() }}</span>
    </div>
    <div
      class="bar"
      role="img"
      [attr.aria-label]="aLabel() + ' ' + a() + ', ' + bLabel() + ' ' + b()"
    >
      <div
        class="a"
        [style.flex]="a()"
      ></div>
      <div
        class="b"
        [style.flex]="b()"
      ></div>
    </div>
  `,
})
export class SplitBarComponent {
  readonly a = input.required<number>();
  readonly b = input.required<number>();
  readonly aLabel = input('BMW');
  readonly bLabel = input('HONDA');
}
