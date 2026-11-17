import { describe, expect, it } from 'vitest';

import {
  WIN_CHANCE_MAX,
  WIN_CHANCE_MIN,
  playerStrength,
  winChance,
  type WinChancePlayer,
} from './win-chance.js';

const player = (
  games: number,
  points: number,
  last = 0,
): WinChancePlayer => ({ games, points, last });

describe('playerStrength (GLOSSARY: Win chance)', () => {
  it('a player without history is the league average, not zero', () => {
    expect(playerStrength(player(0, 0), 3)).toBe(3);
  });

  it('few games pull the player to the average, many games to his own points', () => {
    // 2 games, 10 points: (10 + 5*3) / (2 + 5) = 3.571...
    expect(playerStrength(player(2, 10), 3)).toBeCloseTo(25 / 7, 6);
    // 100 games, 500 points: (500 + 15) / 105 = 4.904...
    expect(playerStrength(player(100, 500), 3)).toBeCloseTo(515 / 105, 6);
  });

  it('a quarter of the last game is added, a negative strength is zero', () => {
    expect(playerStrength(player(0, 0, 4), 3)).toBe(4);
    expect(playerStrength(player(10, -100), 0)).toBe(0);
  });
});

describe('winChance', () => {
  const average = 3;
  const strong = [player(20, 80), player(20, 70), player(20, 60)];
  const weak = [player(20, 20), player(20, 25), player(20, 15)];

  it('the two numbers always make 100', () => {
    for (const [a, b] of [
      [strong, weak],
      [weak, strong],
      [strong, strong],
      [[], strong],
    ] as const) {
      const chance = winChance([...a], [...b], average);
      expect(chance.a + chance.b).toBe(100);
    }
  });

  it('equal squads give 50 and 50, and so do empty squads', () => {
    expect(winChance(strong, strong, average)).toEqual({ a: 50, b: 50 });
    expect(winChance([], [], average)).toEqual({ a: 50, b: 50 });
  });

  it('is symmetric: swapping the teams swaps the numbers', () => {
    const ab = winChance(strong, weak, average);
    const ba = winChance(weak, strong, average);

    expect(ba).toEqual({ a: ab.b, b: ab.a });
  });

  it('a stronger squad has a higher chance', () => {
    const slightly = [player(20, 62), player(20, 70), player(20, 60)];
    const base = winChance(strong, weak, average).a;

    expect(base).toBeGreaterThan(50);
    expect(winChance(slightly, weak, average).a).toBeLessThan(base);
    expect(winChance(strong, weak, average).b).toBeLessThan(50);
  });

  it('never a verdict: the number stays between 25 and 75', () => {
    const giants = [player(50, 900), player(50, 900)];
    const nobody = [player(50, 0)];

    const chance = winChance(giants, nobody, average);
    expect(chance.a).toBe(WIN_CHANCE_MAX);
    expect(chance.b).toBe(WIN_CHANCE_MIN);
  });

  it('a player without history does not break it', () => {
    const chance = winChance(
      [player(0, 0), player(0, 0)],
      [player(10, 30), player(10, 30)],
      average,
    );

    expect(Number.isFinite(chance.a)).toBe(true);
    expect(chance.a).toBeGreaterThanOrEqual(WIN_CHANCE_MIN);
    expect(chance.a + chance.b).toBe(100);
  });

  it('a bigger squad is stronger when the players are equal', () => {
    const six = Array.from({ length: 6 }, () => player(10, 30));
    const seven = Array.from({ length: 7 }, () => player(10, 30));

    expect(winChance(seven, six, average).a).toBeGreaterThan(50);
  });

  it('zero strength on both sides is a draw of chances', () => {
    const zero = [player(10, -50)];
    expect(winChance(zero, zero, 0)).toEqual({ a: 50, b: 50 });
  });
});
