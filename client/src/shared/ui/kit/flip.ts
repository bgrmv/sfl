import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Split-flap digits of an old stadium board (docs/design/flip-board-and-ribbon.md).
 * A tile is re-created when its digit changes, so only that tile flips. The value is read
 * as one label; with `prefers-reduced-motion` the tiles change without the flip.
 */
@Component({
  selector: 'sfl-flip-digits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      --flip-h: 1.25em;
    }
    .row {
      display: inline-flex;
      align-items: center;
      gap: 0.08em;
      font-family: var(--sfl-font-head);
      font-weight: 700;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .tile {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0.78em;
      height: var(--flip-h);
      padding: 0 0.1em;
      border-radius: 0.09em;
      background: linear-gradient(#211e17 0 50%, #16140f 50% 100%);
      color: var(--sfl-accent);
      box-shadow: inset 0 0 0 1px #2e2a20;
      transform-origin: 50% 50%;
      animation: flip 420ms cubic-bezier(0.3, 0.7, 0.3, 1);
      backface-visibility: hidden;
    }
    /* the hinge of the flap */
    .tile::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: #000;
      opacity: 0.7;
    }
    .sep {
      padding: 0 0.12em;
      color: var(--sfl-accent);
    }
    @keyframes flip {
      0% {
        transform: perspective(4em) rotateX(88deg);
        filter: brightness(0.6);
      }
      60% {
        transform: perspective(4em) rotateX(-12deg);
      }
      100% {
        transform: perspective(4em) rotateX(0);
        filter: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .tile {
        animation: none;
      }
    }
  `,
  host: {
    role: 'img',
    '[attr.aria-label]': 'label() || value()',
    '[style.font-size.px]': 'size()',
  },
  template: `
    <span
      class="row"
      aria-hidden="true"
    >
      @for (c of chars(); track c.key) {
        @if (c.digit) {
          <span class="tile">{{ c.ch }}</span>
        } @else {
          <span class="sep">{{ c.ch }}</span>
        }
      }
    </span>
  `,
})
export class FlipDigitsComponent {
  readonly value = input.required<string>();
  readonly label = input('');
  readonly size = input(56);
  /** The key holds the position and the character: a changed digit is a new tile. */
  protected readonly chars = computed(() =>
    [...this.value()].map((ch, i) => ({
      ch,
      digit: /\d/.test(ch),
      key: `${i}:${ch}`,
    })),
  );
}
