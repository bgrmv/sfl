import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, timer } from 'rxjs';
import { format } from 'date-fns';
import { GameService, GamesStore, seasonRibbon } from '@entities/game';
import {
  PlayersService,
  PlayersStatsStore,
  allSeasons,
  captainRecord,
  rankingRows,
  seasonMetadata,
} from '@entities/player';
import { AuthService } from '@shared/auth/auth.service';
import { BIRTHDAYS, COMMENTS, PLAYERS, VOTES } from '@shared/dummy';
import { getTotalWeeksBySeason } from '@shared/lib/date';
import { countdown, monthCells, nextSaturday } from '@shared/lib/saturdays';
import { RatingSystemStore } from '@shared/store/rating-system.store';
import { KIT } from '@shared/ui/kit';

/**
 * Home of the "Табло" design. Each block has a flag in `@shared/config/feature-flags` (`home.*`).
 * LIVE: next Saturday, last game, season numbers, top of the season, form, mini calendar,
 * captains, latest games. DUMMY: captains of the day and RSVP, hot feed, memories, birthdays,
 * vote, player in focus, photos, comments.
 */
@Component({
  selector: 'sfl-home',
  imports: [RouterLink, ...KIT],
  providers: [GameService, GamesStore, PlayersService, PlayersStatsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly games = inject(GamesStore);
  private readonly players = inject(PlayersStatsStore);
  readonly signedIn = computed(() => !!this.auth.user());

  private readonly today = new Date();
  protected readonly season = this.today.getFullYear();
  protected readonly loading = computed(
    () => this.games.loading() || this.players.loading(),
  );

  constructor() {
    effect(() => this.games.initGamesStore({ season: this.season }));
  }

  // ---- LIVE: next Saturday
  protected readonly nextDate = nextSaturday(this.today);
  protected readonly nextLabel = format(this.nextDate, 'EEEE, d MMMM');
  /** Ticks twice a minute: the flip board shows the time that is left right now. */
  private readonly now = toSignal(
    timer(0, 30_000).pipe(map(() => new Date())),
    { initialValue: this.today },
  );
  protected readonly counter = computed(() => {
    const c = countdown(this.nextDate, this.now());
    const two = (n: number) => String(n).padStart(2, '0');
    return [
      { v: two(c.days), l: 'days' },
      { v: two(c.hours), l: 'hours' },
      { v: two(c.minutes), l: 'min' },
    ];
  });
  protected readonly counterLabel = computed(() => {
    const [d, h, m] = this.counter();
    return `Time left: ${Number(d.v)} days ${Number(h.v)} hours ${Number(m.v)} minutes`;
  });

  protected readonly ribbon = computed(() =>
    seasonRibbon(this.games.gamesEntities(), this.season, this.today),
  );

  // ---- LIVE: games of the season
  private readonly played = computed(() =>
    this.games
      .gamesEntities()
      .filter(g => g.status === 'published')
      .sort((a, b) => b.number - a.number),
  );
  private readonly names = computed(
    () => new Map(this.players.playersEntities().map(p => [p.id, p.nickname])),
  );

  protected readonly last = computed(() => {
    const g = this.played()[0];
    if (!g) {
      return null;
    }
    const m = g.metadata ?? {};
    const teamOf = (captain: string) =>
      g.teams.find(
        t => t.id === g.statistics.find(s => s.playerId === captain)?.teamId,
      )?.name ?? '';
    const mvps = ((m.mvpListIds ?? []) as string[]).map(id => ({
      id,
      name: this.names().get(id) ?? 'Unknown',
    }));
    return {
      number: g.number,
      season: g.season,
      date: format(g.playedAt, 'd MMM'),
      a: teamOf(m.captainFirstDraft),
      b: teamOf(m.captainSecondDraft),
      sa: m.scoreFirstDraft ?? 0,
      sb: m.scoreSecondDraft ?? 0,
      mvps,
      story: g.description,
      heads: m.totalGoalsByHead ?? 0,
      passes: m.totalPasses ?? 0,
      og: m.totalGoalsByAuto ?? 0,
    };
  });

  protected readonly latestGames = computed(() =>
    this.played()
      .slice(0, 5)
      .map(g => ({
        number: g.number,
        season: g.season,
        date: format(g.playedAt, 'd MMM yyyy'),
        a: g.metadata?.scoreFirstDraft ?? 0,
        b: g.metadata?.scoreSecondDraft ?? 0,
      })),
  );

  protected readonly ranking = computed(() => {
    const keys = allSeasons(this.players.playersEntities());
    const key = keys.includes(String(this.season))
      ? String(this.season)
      : keys[0];
    return {
      key,
      rows: key
        ? rankingRows(this.players.playersEntities(), key, this.system())
        : [],
    };
  });
  protected readonly top = computed(() => this.ranking().rows.slice(0, 5));

  protected readonly kpis = computed(() => {
    const done = this.played().slice().reverse();
    const goals = done.map(g => g.metadata?.totalGoals ?? 0);
    const sum = goals.reduce((a, b) => a + b, 0);
    const per = done.length ? (sum / done.length).toFixed(1) : '0';
    const cumulative = goals.map((_, i) =>
      goals.slice(0, i + 1).reduce((a, b) => a + b, 0),
    );
    const rows = this.ranking().rows;
    const gap = rows.length > 1 ? rows[0].pts - rows[1].pts : 0;
    const total = getTotalWeeksBySeason(this.season);
    const spark = (a: number[]) => (a.length > 1 ? a : [0, ...a, ...a]);
    return [
      {
        l: 'Games played',
        v: `${done.length} / ${total}`,
        s: `${Math.max(0, total - done.length)} Saturdays left`,
        spark: spark(done.map((_, i) => i + 1)),
      },
      {
        l: 'Goals',
        v: String(sum),
        s: `${per} per game`,
        spark: spark(cumulative),
      },
      {
        l: 'Active players',
        v: String(rows.length),
        s: `${this.players.playersEntities().length} in the league`,
        spark: spark(rows.map(r => r.days)),
      },
      {
        l: 'Closest race',
        v: `${gap} pts`,
        s: rows.length > 1 ? `${rows[0].name} and ${rows[1].name}` : '–',
        spark: spark(rows.map(r => r.pts)),
      },
    ];
  });

  protected readonly formBars = computed(() =>
    this.played()
      .slice(0, 12)
      .reverse()
      .map(g => ({
        v: g.metadata?.totalGoals ?? 0,
        win: !g.metadata?.scoreIsDraw,
        label: String(g.number),
      })),
  );
  protected readonly wins = computed(() => {
    const byName = new Map<string, number>();
    for (const g of this.played()) {
      const id = g.metadata?.teamWon as string | null | undefined;
      const name = g.teams.find(t => t.id === id)?.name;
      if (name) {
        byName.set(name, (byName.get(name) ?? 0) + 1);
      }
    }
    const [a, b] = [...byName.entries()];
    return { a: a ?? ['BMW', 0], b: b ?? ['HONDA', 0] } as {
      a: [string, number];
      b: [string, number];
    };
  });

  protected readonly month = computed(() =>
    monthCells(
      this.today.getFullYear(),
      this.today.getMonth(),
      this.played().map(g => g.playedAt),
      this.today,
    ),
  );
  protected readonly monthLabel = format(this.today, 'MMMM yyyy');

  protected readonly captains = computed(() => {
    const key = this.ranking().key;
    return key
      ? this.players
          .captains()
          .flatMap(p => {
            const m = seasonMetadata(p, key);
            const r = m ? captainRecord(m) : null;
            return r && r.games > 0
              ? [
                  {
                    id: p.id,
                    name: p.nickname,
                    rec: `${r.w}–${r.d}–${r.l}`,
                    rate: r.rate,
                  },
                ]
              : [];
          })
          .sort((a, b) => b.rate - a.rate)
          .slice(0, 3)
      : [];
  });

  protected readonly system = inject(RatingSystemStore).system;

  // ---- DUMMY data (see flags)
  protected readonly hot = [
    {
      k: 'Streak',
      who: 'Otter',
      what: 'has 5 games without a loss',
      when: 'this week',
      top: true,
    },
    {
      k: 'Record',
      who: 'Falcon',
      what: 'scored a hat-trick in game 46',
      when: '14 Nov',
      top: true,
    },
    {
      k: 'Rise',
      who: 'Lynx',
      what: 'went up 3 places in the table',
      when: '7 Nov',
      top: false,
    },
  ];
  protected readonly focus = PLAYERS[2];
  protected readonly photos = [
    { tags: ['Falcon', 'Game 46'] },
    { tags: ['Lynx'] },
    { tags: ['Wolf', 'Tank'] },
    { tags: ['Game 45'] },
  ];
  protected readonly comments = COMMENTS;
  protected readonly birthdays = BIRTHDAYS;
  protected readonly vote = VOTES[0];
  protected readonly tiles = [
    ['Rules', '/rules', 'The codex of the league'],
    ['How points work', '/scoring', 'Two rating systems'],
    ['Seasons', '/seasons', 'Awards and hall of fame'],
    ['Captains', '/captains', 'Who picks first'],
    ['Photo and video', '/media', 'The album'],
    ['History', '/history', 'Since 1980'],
  ] as const;
}
