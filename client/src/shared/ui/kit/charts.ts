import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { FlipDigitsComponent } from './flip';

/** Every chart is `role="img"` with a text alternative (audit of the canvas, finding 5). */

@Component({
  selector: 'sfl-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      role="img"
      [attr.aria-label]="label()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      [attr.width]="width()"
      [attr.height]="height()"
    >
      <path
        [attr.d]="path()"
        fill="none"
        stroke="var(--sfl-accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
})
export class SparklineComponent {
  readonly values = input.required<readonly number[]>();
  readonly width = input(80);
  readonly height = input(28);
  readonly label = input('Trend');
  readonly path = computed(() => {
    const v = this.values();
    const mx = Math.max(...v);
    const mn = Math.min(...v);
    const w = this.width();
    const h = this.height();
    return v
      .map(
        (x, i) =>
          `${i ? 'L' : 'M'}${((i * w) / Math.max(v.length - 1, 1)).toFixed(1)} ${(
            h -
            3 -
            ((x - mn) / (mx - mn || 1)) * (h - 6)
          ).toFixed(1)}`,
      )
      .join('');
  });
}

export interface Bar {
  readonly v: number;
  readonly win?: boolean;
  readonly label?: string;
}

/** Vertical bars: win is accent, not a win is outlined. */
@Component({
  selector: 'sfl-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .wrap {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: var(--h, 120px);
    }
    .col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      font-size: 11px;
      gap: 2px;
    }
    .bar {
      width: 100%;
      min-height: 2px;
      background: var(--sfl-chip);
      border-radius: 2px 2px 0 0;
    }
    .bar.win {
      background: var(--sfl-accent);
    }
  `,
  template: `
    <div
      class="wrap"
      role="img"
      [attr.aria-label]="label()"
      [style.--h.px]="height()"
    >
      @for (b of bars(); track $index) {
        <div class="col">
          <span class="k-num">{{ b.v }}</span>
          <div
            class="bar"
            [class.win]="b.win"
            [style.height.%]="(b.v / max()) * 80"
          ></div>
          @if (b.label) {
            <span class="k-muted">{{ b.label }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class BarsComponent {
  readonly bars = input.required<readonly Bar[]>();
  readonly height = input(120);
  readonly label = input('Bar chart');
  readonly max = computed(() => Math.max(1, ...this.bars().map(b => b.v)));
}

export interface RadarAxis {
  readonly t: string;
  readonly a: number; // 0..1 player
  readonly b: number; // 0..1 league average
}

@Component({
  selector: 'sfl-radar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="-120 -110 240 220"
      width="100%"
      style="max-width: 320px"
      role="img"
      [attr.aria-label]="'Style of play: ' + summary()"
    >
      @for (r of rings; track r) {
        <polygon
          [attr.points]="ring(r)"
          fill="none"
          stroke="var(--sfl-border)"
        />
      }
      <polygon
        [attr.points]="poly('b')"
        fill="none"
        stroke="var(--sfl-muted)"
        stroke-dasharray="4 3"
      />
      <polygon
        [attr.points]="poly('a')"
        fill="rgba(255,210,31,.25)"
        stroke="var(--sfl-accent)"
        stroke-width="2"
      />
      @for (l of labels(); track l.t) {
        <text
          [attr.x]="l.x"
          [attr.y]="l.y"
          text-anchor="middle"
          font-size="10"
          fill="var(--sfl-muted)"
        >
          {{ l.t }}
        </text>
      }
    </svg>
  `,
})
export class RadarComponent {
  readonly axes = input.required<readonly RadarAxis[]>();
  protected readonly rings = [0.33, 0.66, 1];
  readonly summary = computed(() =>
    this.axes()
      .map(a => `${a.t} ${Math.round(a.a * 100)}%`)
      .join(', '),
  );
  private pt(i: number, r: number): [number, number] {
    const ang = (Math.PI * 2 * i) / this.axes().length - Math.PI / 2;
    return [Math.cos(ang) * r * 85, Math.sin(ang) * r * 85];
  }
  ring(r: number): string {
    return this.axes()
      .map((_, i) =>
        this.pt(i, r)
          .map(n => n.toFixed(1))
          .join(','),
      )
      .join(' ');
  }
  poly(k: 'a' | 'b'): string {
    return this.axes()
      .map((a, i) =>
        this.pt(i, a[k])
          .map(n => n.toFixed(1))
          .join(','),
      )
      .join(' ');
  }
  readonly labels = computed(() =>
    this.axes().map((a, i) => {
      const [x, y] = this.pt(i, 1.28);
      return { t: a.t, x, y: y + 3 };
    }),
  );
}

export interface PitchPlayer {
  readonly n: number;
  readonly name: string;
  readonly x: number; // 0..100
  readonly y: number; // 0..100 (0 = north, sea)
  readonly team: 'a' | 'b';
  readonly captain?: boolean;
}

/** Line-up map: the sea in the north, the dunes in the south. */
@Component({
  selector: 'sfl-pitch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .pitch {
      position: relative;
      aspect-ratio: 16 / 9;
      border-radius: var(--sfl-radius);
      overflow: hidden;
      background: linear-gradient(
        var(--sfl-sea) 0 18%,
        var(--sfl-surface-2) 18% 82%,
        var(--sfl-dune) 82%
      );
      border: 1px solid var(--sfl-border);
    }
    .zone {
      position: absolute;
      left: 8px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--sfl-muted);
    }
    .p {
      position: absolute;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 11px;
    }
    .dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .a .dot {
      background: var(--sfl-bmw);
      color: var(--sfl-on-bmw);
    }
    .b .dot {
      background: var(--sfl-honda);
      color: #0d0c0a;
    }
  `,
  template: `
    <div
      class="pitch"
      role="img"
      [attr.aria-label]="'Line-up map, ' + players().length + ' players'"
    >
      <span
        class="zone"
        style="top: 4px"
      >
        North · sea
      </span>
      <span
        class="zone"
        style="bottom: 4px"
      >
        South · dunes
      </span>
      @for (p of players(); track p.n) {
        <div
          class="p"
          [class]="p.team"
          [style.left.%]="p.x"
          [style.top.%]="p.y"
        >
          <span class="dot">{{ p.captain ? 'C' : p.n }}</span>
          <span>{{ p.name }}</span>
        </div>
      }
    </div>
  `,
})
export class PitchComponent {
  readonly players = input.required<readonly PitchPlayer[]>();
}

/** Score board with the two team shields. */
@Component({
  selector: 'sfl-scoreboard',
  imports: [FlipDigitsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .sb {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      background: var(--sfl-score-bg);
      color: #f6f1e4;
      padding: 20px;
      border-radius: var(--sfl-radius);
    }
    .team {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .team.r {
      text-align: right;
      align-items: flex-end;
    }
    .name {
      font-family: var(--sfl-font-head);
      font-weight: 700;
      font-size: 28px;
      letter-spacing: 0.04em;
    }
    .score {
      font-family: var(--sfl-font-head);
      font-weight: 700;
      font-size: 56px;
      color: var(--sfl-accent);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .sub {
      color: #b3aa94;
      font-size: 13px;
    }
    @media (max-width: 520px) {
      .name {
        font-size: 20px;
      }
      .score {
        font-size: 40px;
      }
    }
  `,
  template: `
    <div
      class="sb"
      role="group"
      [attr.aria-label]="aName() + ' ' + a() + ' to ' + b() + ' ' + bName()"
    >
      <div class="team">
        <span class="name">{{ aName() }}</span>
        <span class="sub">{{ aSub() }}</span>
      </div>
      <sfl-flip-digits
        class="score"
        [value]="a() + ':' + b()"
        [label]="a() + ' to ' + b()"
        [size]="56"
      />
      <div class="team r">
        <span class="name">{{ bName() }}</span>
        <span class="sub">{{ bSub() }}</span>
      </div>
    </div>
  `,
})
export class ScoreboardComponent {
  readonly aName = input('BMW');
  readonly bName = input('HONDA');
  readonly a = input.required<number>();
  readonly b = input.required<number>();
  readonly aSub = input('');
  readonly bSub = input('');
}

export interface CalendarCell {
  readonly d: number | null;
  readonly kind?: 'played' | 'next' | 'planned' | 'birthday' | 'skipped';
  readonly today?: boolean;
}

@Component({
  selector: 'sfl-month',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .g {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      text-align: center;
      font-size: 13px;
    }
    .h {
      font-size: 11px;
      color: var(--sfl-muted);
      text-transform: uppercase;
    }
    .c {
      min-height: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: var(--sfl-radius);
      border: 1px solid transparent;
    }
    .c.played {
      background: var(--sfl-chip);
    }
    .c.next {
      background: var(--sfl-accent);
      color: var(--sfl-on-accent);
      font-weight: 700;
    }
    .c.planned {
      border: 1px dashed var(--sfl-muted);
    }
    .c.skipped {
      text-decoration: line-through;
      color: var(--sfl-muted);
    }
    .c.today {
      border: 2px solid var(--sfl-text);
    }
    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--sfl-accent);
    }
  `,
  template: `
    <div
      class="g"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (d of dows; track $index) {
        <span class="h">{{ d }}</span>
      }
      @for (c of cells(); track $index) {
        <span
          class="c k-num"
          [class]="c.kind ?? ''"
          [class.today]="c.today"
          [title]="c.kind ?? ''"
        >
          {{ c.d }}
          @if (c.kind === 'birthday') {
            <span class="dot"></span>
          }
        </span>
      }
    </div>
  `,
})
export class MonthComponent {
  readonly cells = input.required<readonly CalendarCell[]>();
  readonly label = input('Month calendar');
  protected readonly dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
}
