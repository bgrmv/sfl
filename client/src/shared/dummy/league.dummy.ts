/**
 * DUMMY DATA of the design "Табло". Nothing here comes from MongoDB.
 * Every page that imports this file shows a block that still needs a store/service
 * (see `needs` of the block in `@shared/config/feature-flags`).
 */

export interface DummyPlayer {
  readonly id: string;
  readonly name: string;
  readonly ini: string;
  readonly no: number;
  readonly pos: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  readonly captain?: boolean;
  readonly rank: number;
  readonly move: string;
  readonly form: string;
  readonly days: number;
  readonly goals: number;
  readonly passes: number;
  readonly og: number;
  readonly pm: string;
  readonly lr: string;
  readonly mvp: number;
  readonly pts: number;
}

const P = (
  rank: number,
  name: string,
  no: number,
  pos: DummyPlayer['pos'],
  form: string,
  days: number,
  goals: number,
  passes: number,
  og: number,
  pm: string,
  lr: string,
  mvp: number,
  pts: number,
  move: string,
  captain = false,
): DummyPlayer => ({
  id: name.toLowerCase(),
  name,
  ini: name.slice(0, 2).toUpperCase(),
  no,
  pos,
  captain,
  rank,
  move,
  form,
  days,
  goals,
  passes,
  og,
  pm,
  lr,
  mvp,
  pts,
});

export const PLAYERS: readonly DummyPlayer[] = [
  P(
    1,
    'Falcon',
    9,
    'Forward',
    'WWDWL',
    12,
    18,
    6,
    0,
    '+21',
    '+7',
    4,
    32,
    '–',
    true,
  ),
  P(
    2,
    'Lynx',
    7,
    'Midfielder',
    'WLWWW',
    12,
    11,
    12,
    1,
    '+14',
    '+6',
    3,
    29,
    '▲1',
  ),
  P(
    3,
    'Otter',
    5,
    'Midfielder',
    'WWWDW',
    11,
    8,
    13,
    0,
    '+12',
    '+7',
    2,
    27,
    '▲2',
  ),
  P(
    4,
    'Wolf',
    10,
    'Forward',
    'LWWLW',
    12,
    14,
    4,
    0,
    '+6',
    '+2',
    1,
    24,
    '▼2',
    true,
  ),
  P(5, 'Hawk', 11, 'Forward', 'DWLWW', 10, 10, 7, 2, '+5', '+3', 1, 22, '▼1'),
  P(
    6,
    'Tank',
    4,
    'Defender',
    'WLWDL',
    12,
    3,
    5,
    0,
    '+4',
    '+1',
    1,
    19,
    '–',
    true,
  ),
  P(7, 'Viper', 8, 'Midfielder', 'LLWWD', 9, 6, 6, 0, '+1', '0', 0, 16, '▲1'),
  P(8, 'Pike', 3, 'Defender', 'WDLLW', 11, 2, 3, 1, '0', '0', 0, 14, '▼1'),
  P(9, 'Orion', 6, 'Midfielder', 'LDWLL', 8, 4, 5, 0, '-3', '-2', 0, 11, '–'),
  P(10, 'Rocket', 14, 'Forward', 'LLWLD', 10, 7, 1, 0, '-5', '-3', 0, 10, '▼1'),
  P(11, 'Raven', 2, 'Goalkeeper', 'DWLLL', 7, 0, 1, 0, '-6', '-4', 0, 7, '▲1'),
  P(12, 'Echo', 15, 'Defender', 'LLLDL', 6, 1, 2, 2, '-9', '-5', 0, 4, '–'),
];

export interface DummyGame {
  readonly number: number;
  readonly date: string;
  readonly a: number;
  readonly b: number;
  readonly mvp: string;
  readonly status: 'Published' | 'Draft' | 'Skipped';
}

export const GAMES: readonly DummyGame[] = [
  {
    number: 46,
    date: '14 Nov 2026',
    a: 4,
    b: 1,
    mvp: 'Falcon',
    status: 'Published',
  },
  {
    number: 45,
    date: '7 Nov 2026',
    a: 3,
    b: 3,
    mvp: 'Lynx',
    status: 'Published',
  },
  {
    number: 44,
    date: '31 Oct 2026',
    a: 2,
    b: 5,
    mvp: 'Wolf',
    status: 'Published',
  },
  {
    number: 43,
    date: '24 Oct 2026',
    a: 6,
    b: 4,
    mvp: 'Otter',
    status: 'Published',
  },
  {
    number: 42,
    date: '17 Oct 2026',
    a: 1,
    b: 2,
    mvp: 'Hawk',
    status: 'Published',
  },
  { number: 41, date: '10 Oct 2026', a: 0, b: 0, mvp: '–', status: 'Skipped' },
  {
    number: 40,
    date: '3 Oct 2026',
    a: 5,
    b: 5,
    mvp: 'Falcon',
    status: 'Published',
  },
  { number: 47, date: '21 Nov 2026', a: 6, b: 4, mvp: '–', status: 'Draft' },
];

export const SEASONS = [
  'S26 · now',
  'S25',
  'S24',
  'S23',
  'S22–S11',
  'All time',
] as const;
export const SYSTEMS = ['Ancient', 'Positional'] as const;
export const POSITIONS = [
  {
    code: 'GK',
    name: 'Goalkeeper',
    icon: 'gk',
    idea: 'Gloves, a box',
    win: '+4',
    loss: '−4',
  },
  {
    code: 'DF',
    name: 'Defender',
    icon: 'df',
    idea: 'Shield',
    win: '+3',
    loss: '−2',
  },
  {
    code: 'MF',
    name: 'Midfielder',
    icon: 'mf',
    idea: 'Circle in the centre',
    win: '+2',
    loss: '−1',
  },
  {
    code: 'FW',
    name: 'Forward',
    icon: 'fw',
    idea: 'Star at the top',
    win: '+1',
    loss: '0',
  },
] as const;

export const RULE_SECTIONS = [
  {
    n: 1,
    t: 'When and where we play',
    items: [
      {
        no: '1.1',
        t: 'When we play',
        p: 'The league plays every Saturday, in any weather. A skipped week is marked in the schedule.',
      },
      {
        no: '1.2',
        t: 'Teams',
        p: 'Two teams, BMW and HONDA. The colour is only a bib: captains decide who wears which.',
      },
    ],
  },
  {
    n: 2,
    t: 'Draft and captains',
    items: [
      {
        no: '2.1',
        t: 'Captains',
        p: 'Captains are chosen from the league list. The captain who picks first leads the 1st draft.',
      },
      {
        no: '2.2',
        t: 'Transfer',
        p: 'A transfer plays for both teams; his goals count for the team where they were made.',
      },
    ],
  },
  {
    n: 3,
    t: 'Goals and points',
    items: [
      {
        no: '3.1',
        t: 'Goal',
        p: 'A goal is +1 point. A header counts double. A penalty counts +1.',
      },
      {
        no: '3.2',
        t: 'Own goal',
        p: 'Counts for the opponent and −1 for the author.',
      },
    ],
  },
] as const;

export const VOTES = [
  {
    id: 1,
    kind: 'Proposal',
    title: 'Clean sheet bonus for the goalkeeper',
    text: 'A goalkeeper who lets in no goals gets +2 points.',
    y: 11,
    n: 4,
    end: 'Ends in 3 days',
    mine: 'Yes',
  },
  {
    id: 2,
    kind: 'Complaint',
    title: 'Late arrivals start on the bench',
    text: 'Whoever is more than 10 minutes late joins at the next substitution.',
    y: 7,
    n: 7,
    end: 'Ends in 5 days',
    mine: '',
  },
  {
    id: 3,
    kind: 'Proposal',
    title: 'Two weeks break in winter',
    text: 'Play on the last Saturday of December only.',
    y: 3,
    n: 12,
    end: 'Ends in 6 days',
    mine: 'No',
  },
] as const;

export const KPIS = [
  {
    l: 'Games played',
    v: '12 / 16',
    s: '4 Saturdays left',
    spark: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    l: 'Goals',
    v: '112',
    s: '▲ 9.3 per game, +0.6 to S25',
    spark: [7, 9, 8, 10, 9, 11, 10, 12, 9, 8, 11, 9],
  },
  {
    l: 'Active players',
    v: '24',
    s: '38 in the league',
    spark: [18, 19, 20, 20, 21, 22, 22, 23, 23, 24, 24, 24],
  },
  {
    l: 'Closest race',
    v: '2 pts',
    s: 'Falcon and Lynx',
    spark: [9, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 2],
  },
] as const;

export const NUMBERS_SEASON = [
  {
    label: 'Days',
    value: '12',
    sub: 'of 12 Saturdays',
    tip: 'Saturdays the player took part in.',
  },
  {
    label: 'Goals',
    value: '18',
    sub: '1.5 per day',
    tip: 'A header counts double in points.',
  },
  {
    label: 'Passes',
    value: '6',
    sub: '0.5 per day',
    tip: '+1 point for the passer.',
  },
  { label: 'Own goals', value: '0', sub: '', tip: '−1 point for the author.' },
  { label: 'Headers', value: '5', sub: '28% of goals', tip: '' },
  {
    label: 'Place',
    value: '#1',
    sub: 'in the top',
    tip: 'Place in the ranking of the chosen system.',
  },
  {
    label: '+/−',
    value: '+21',
    sub: '',
    tip: 'Team goals minus rival goals per game, summed.',
  },
  {
    label: 'LR',
    value: '+7',
    sub: '',
    tip: '+1 for a win, −1 for a loss, 0 for a draw.',
  },
  { label: 'MVP', value: '4', sub: '', tip: '' },
  { label: 'Points', value: '32', sub: '2.7 per day', tip: '' },
] as const;

export const SEASON_ROWS = [
  {
    season: 'S26',
    games: 12,
    goals: 18,
    passes: 6,
    points: 32,
    pm: '+21',
    mvp: 4,
    lr: '+7',
  },
  {
    season: 'S25',
    games: 15,
    goals: 20,
    passes: 9,
    points: 38,
    pm: '+18',
    mvp: 3,
    lr: '+5',
  },
  {
    season: 'S24',
    games: 16,
    goals: 14,
    passes: 10,
    points: 30,
    pm: '+9',
    mvp: 2,
    lr: '+3',
  },
] as const;

export const RELEASES = [
  {
    v: '2026.11.3',
    d: '15 Nov 2026',
    t: 'Two scoring systems, side by side',
    n: 12,
  },
  { v: '2026.11.2', d: '8 Nov 2026', t: 'Compare players and captains', n: 9 },
  { v: '2026.10.4', d: '25 Oct 2026', t: 'Calendar and subscriptions', n: 7 },
] as const;

export const COMMENTS = [
  {
    who: 'Viper',
    game: 46,
    when: '15 Nov, 10:12',
    text: 'Great game, the penalty at the end was fair.',
  },
  {
    who: 'Pike',
    game: 46,
    when: '15 Nov, 11:40',
    text: 'Rematch on Saturday?',
  },
  {
    who: 'Marta',
    game: 43,
    when: '25 Oct, 20:01',
    text: 'Best goal of the season!',
  },
] as const;

export const BIRTHDAYS = [
  { name: 'Lynx', date: '19 Nov', age: '32' },
  { name: 'Hawk', date: '2 Dec', age: '29' },
  { name: 'Otter', date: '14 Dec', age: '35' },
] as const;

/** November 2026 starts on Sunday; Saturdays 7, 14, 21, 28. */
export const NOV_2026 = Array.from({ length: 35 }, (_, i) => {
  const d = i - 5;
  const day = d >= 1 && d <= 30 ? d : null;
  const kind =
    day === 21
      ? ('next' as const)
      : day === 7 || day === 14
        ? ('played' as const)
        : day === 28
          ? ('planned' as const)
          : day === 19
            ? ('birthday' as const)
            : undefined;
  return { d: day, kind, today: day === 16 };
});

export const LINEUP = [
  { n: 9, name: 'Falcon', x: 22, y: 30, team: 'a', captain: true },
  { n: 7, name: 'Lynx', x: 35, y: 55, team: 'a' },
  { n: 5, name: 'Otter', x: 20, y: 72, team: 'a' },
  { n: 3, name: 'Pike', x: 40, y: 38, team: 'a' },
  { n: 10, name: 'Wolf', x: 78, y: 32, team: 'b', captain: true },
  { n: 11, name: 'Hawk', x: 64, y: 58, team: 'b' },
  { n: 4, name: 'Tank', x: 80, y: 70, team: 'b' },
  { n: 8, name: 'Viper', x: 60, y: 40, team: 'b' },
] as const;
